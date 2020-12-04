/*
const MagicHome = require('./src/magichome');

module.exports = (homebridge) => {

	var homebridgeGlobals = {
		Service: homebridge.hap.Service,
		Characteristic: homebridge.hap.Characteristic,
		Accessory: homebridge.platformAccessory,
		UUIDGen: homebridge.hap.uuid,
		PersistPath: homebridge.user.storagePath()
	};

	MagicHome.globals.setHomebridge(homebridgeGlobals);
	homebridge.registerPlatform(MagicHome.pluginID, MagicHome.pluginName, MagicHome.platform, true);
}
*/
// NEW

const SynTexDynamicPlatform = require('homebridge-syntex-dynamic-platform').DynamicPlatform;
//const SynTexUniversalAccessory = require('./src/universal');

let DeviceManager = require('../device-manager');

const LightBulb = require('./accessories/lightBulb');
const PresetSwitch = require('./accessories/presetSwitch');
const ResetSwitch = require('./accessories/resetSwitch');
const lightAgent = require('./lib/lightAgent');

const pluginID = 'homebridge-syntex-magichome';
const pluginName = 'SynTexMagicHome';

var homebridge, restart = true;

module.exports = (homebridge) => {

    homebridge.registerPlatform(pluginID, pluginName, SynTexMagicHomePlatform, true);
};

class SynTexMagicHomePlatform extends SynTexDynamicPlatform
{
    constructor(log, config, api)
    {
		super(config, api, pluginID, pluginName);
		
		this.config = config;
	
		this.devices = config['accessories'] || [];
		
		this.cacheDirectory = config['cache_directory'] || './SynTex';
		this.logDirectory = config['log_directory'] || './SynTex/log';
		this.port = config['port'] || 1712;

		if(this.api && this.logger)
        {
            this.api.on('didFinishLaunching', () => {

                DeviceManager = new DeviceManager(this.logger, this.cacheDirectory);

				lightAgent.setLogger(this.logger);

				if(homebridge)
				{
					lightAgent.setPersistPath(homebridge.PersistPath);
				}
				
				if(config && config.debug)
				{
					lightAgent.setVerbose();
				}

				const { exec } = require('child_process');
						
				exec('sudo chmod 777 -R /usr/local/lib/node_modules/' + pluginID + '/src/flux_led.py', (error, stdout, stderr) => {

					if(error)
					{
						this.logger.log('error', 'bridge', 'Bridge', '[flux_led.py] konnte nicht aktiviert werden!');
					}
				});

                this.initWebServer();

                this.loadAccessories();

                restart = false;
            });
        }
	}

	initWebServer()
	{
		this.WebServer.addPage('/devices', async (response, urlParams) => {
	
			if(urlParams.mac != null)
			{
				var accessory = null;
	
				for(var i = 0; i < accessories.length; i++)
				{
					if(accessories[i].mac == urlParams.mac)
					{
						accessory = accessories[i];
					}
				}
	
				if(accessory == null)
				{
					this.logger.log('error', urlParams.mac, '', 'Es wurde kein passendes Gerät in der Config gefunden! ( ' + urlParams.mac + ' )');
	
					response.write('Error');
				}
				else if(urlParams.value != null)
				{
					var state = null;
	
					if((state = validateUpdate(urlParams.mac, accessory.letters, urlParams.value)) != null)
					{
						accessory.changeHandler(state);
					}
					else
					{
						this.logger.log('error', urlParams.mac, accessory.letters, '[' + urlParams.value + '] ist kein gültiger Wert! ( ' + urlParams.mac + ' )');
					}
	
					response.write(state != null ? state.toString() : 'Error');
				}
				else
				{
					var state = await DeviceManager.getDevice(urlParams.mac, accessory.letters);
	
					response.write(state != null ? state.toString() : 'Error');
				}
			}
			else
			{
				response.write('Error');
			}
	
			response.end();
		});

		this.WebServer.addPage('/serverside/version', (response) => {

			response.write(require('../package.json').version);
            response.end();
		});

		this.WebServer.addPage('/serverside/check-restart', (response) => {

			response.write(restart.toString());
            response.end();
		});

		this.WebServer.addPage('/serverside/update', async (response, urlParams) => {

			var version = urlParams.version != null ? urlParams.version : 'latest';

			const { exec } = require('child_process');
			
			exec('sudo npm install ' + pluginID + '@' + version + ' -g', (error, stdout, stderr) => {

				try
				{
					if(error || stderr.includes('ERR!'))
					{
						this.logger.log('warn', 'bridge', 'Bridge', 'Das Plugin ' + pluginName + ' konnte nicht aktualisiert werden! ' + (error || stderr));
					}
					else
					{
						this.logger.log('success', 'bridge', 'Bridge', 'Das Plugin ' + pluginName + ' wurde auf die Version [' + version + '] aktualisiert!');

						restart = true;

						this.logger.log('warn', 'bridge', 'Bridge', 'Die Homebridge wird neu gestartet ..');

						exec('sudo systemctl restart homebridge');
					}

					response.write(error || stderr.includes('ERR!') ? 'Error' : 'Success');
					response.end();
				}
				catch(e)
				{
					this.logger.err(e);
				}
			});
		});
	}

	loadAccessories()
	{
		homebridge.debug = this.config.debug || false;

        for(var i = 0; i < this.devices.length; i++)
        {
            if(this.devices[i].type == 'light')
            {
				var newLightConfig = this.devices[i];

				newLightConfig.debug = this.config.debug || false;

                this.addAccessory(new LightBulb(newLightConfig, this.logger, homebridge, DeviceManager));
            }
            else if(this.devices[i].type == 'preset-switch')
            {
                this.addAccessory(new PresetSwitch(this.devices[i], this.logger, homebridge, DeviceManager));
			}
			else if(this.devices[i].type == 'reset-switch')
            {
                this.addAccessory(new ResetSwitch(this.devices[i], this.logger, homebridge, DeviceManager));
            }
        }
	}
}