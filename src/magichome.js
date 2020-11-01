let DeviceManager = require('../device-manager'), WebServer = require('../webserver'), logger = require('../logger');

const LightBulb = require('./accessories/lightBulb');
const PresetSwitch = require('./accessories/presetSwitch');
const ResetSwitch = require('./accessories/resetSwitch');
const lightAgent = require('./lib/lightAgent');

const pluginName = 'homebridge-syntex-magichome';
const platformName = 'SynTexMagicHome';

var homebridge, restart = true;

function MagicHome(log, config = {}, api)
{
	this.config = config;
	this.lights = [];
	this.presetSwitches = [];
	this.resetSwitches = [];

	//this.devices = config['accessories'] || [];
    
    this.cacheDirectory = config['cache_directory'] || './SynTex';
    this.logDirectory = config['log_directory'] || './SynTex/log';
	this.port = config['port'] || 1712;
	
	logger = new logger(platformName, this.logDirectory, api.user.storagePath());
	WebServer = new WebServer(platformName, logger, this.port, false);
	DeviceManager = new DeviceManager(logger, this.cacheDirectory);

	lightAgent.setLogger(logger);

	if(homebridge)
	{
		lightAgent.setPersistPath(homebridge.PersistPath);
	}
	
	if(config && config.debug)
	{
		lightAgent.setVerbose();
	}

	const { exec } = require('child_process');
			
	exec('sudo chmod 777 -R /usr/local/lib/node_modules/homebridge-syntex-magichome/src/flux_led.py', (error, stdout, stderr) => {

		if(error)
		{
			logger.log('error', 'bridge', 'Bridge', '[flux_led.py] konnte nicht aktiviert werden!');
		}
	});

	restart = false;
}

MagicHome.prototype = {

	accessories: function(callback)
	{
		var accessories = [];

		homebridge.debug = this.config.debug || false;

		if(this.config.lights != null && this.config.lights.length > 0)
		{
			this.config.lights.forEach((lightConfig) => {

				var newLightConfig = lightConfig;

				newLightConfig.debug = this.config.debug || false;

				this.lights.push(new LightBulb(newLightConfig, logger, homebridge, DeviceManager));
			});
		}

		if(this.config.presetSwitches != null && this.config.presetSwitches.length > 0)
		{
			this.config.presetSwitches.forEach((switchConfig) => {

				this.presetSwitches.push(new PresetSwitch(switchConfig, logger, homebridge, DeviceManager));
			});
		}

		if(this.config.resetSwitch != null)
		{
			this.resetSwitches.push(new ResetSwitch(this.config.resetSwitch, logger, homebridge, DeviceManager));
		}

		accessories = this.lights.concat(this.presetSwitches).concat(this.resetSwitches);

		callback(accessories);

		WebServer.addPage('/devices', async (response, urlParams) => {
	
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
					logger.log('error', urlParams.mac, '', 'Es wurde kein passendes Gerät in der Config gefunden! ( ' + urlParams.mac + ' )');
	
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
						logger.log('error', urlParams.mac, accessory.letters, '[' + urlParams.value + '] ist kein gültiger Wert! ( ' + urlParams.mac + ' )');
					}
	
					response.write(state != null ? 'Success' : 'Error');
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

		WebServer.addPage('/serverside/version', (response) => {

			response.write(require('../package.json').version);
            response.end();
		});

		WebServer.addPage('/serverside/check-restart', (response) => {

			response.write(restart.toString());
            response.end();
		});

		WebServer.addPage('/serverside/update', async (response, urlParams) => {

			var version = urlParams.version != null ? urlParams.version : 'latest';

			const { exec } = require('child_process');
			
			exec('sudo npm install homebridge-syntex-magichome@' + version + ' -g', (error, stdout, stderr) => {

				try
				{
					if(error || stderr.includes('ERR!'))
					{
						logger.log('warn', 'bridge', 'Bridge', 'Die Homebridge konnte nicht aktualisiert werden! ' + (error || stderr));
					}
					else
					{
						logger.log('success', 'bridge', 'Bridge', 'Die Homebridge wurde auf die Version [' + version + '] aktualisiert!');

						restart = true;

						logger.log('warn', 'bridge', 'Bridge', 'Die Homebridge wird neu gestartet ..');

						exec('sudo systemctl restart homebridge');
					}

					response.write(error || stderr.includes('ERR!') ? 'Error' : 'Success');
					response.end();
				}
				catch(e)
				{
					logger.err(e);
				}
			});
		});
	}
}

function validateUpdate(mac, letters, state)
{
    var type = letterToType(letters[0]);

    if(type === 'motion' || type === 'rain' || type === 'smoke' || type === 'occupancy' || type === 'contact' || type == 'switch' || type == 'relais')
    {
        if(state != true && state != false && state != 'true' && state != 'false')
        {
            logger.log('warn', mac, letters, 'Konvertierungsfehler: [' + state + '] ist keine boolsche Variable! ( ' + mac + ' )');

            return null;
        }

        return (state == 'true' || state == true ? true : false);
    }
    else if(type === 'light' || type === 'temperature')
    {
        if(isNaN(state))
        {
            logger.log('warn', mac, letters, 'Konvertierungsfehler: [' + state + '] ist keine numerische Variable! ( ' + mac + ' )');
        }

        return !isNaN(state) ? parseFloat(state) : null;
    }
    else if(type === 'humidity' || type === 'airquality')
    {
        if(isNaN(state))
        {
            logger.log('warn', mac, letters, 'Konvertierungsfehler: [' + state + '] ist keine numerische Variable! ( ' + mac + ' )');
        }

        return !isNaN(state) ? parseInt(state) : null;
    }
    else
    {
        return state;
    }
}

var types = ['contact', 'motion', 'temperature', 'humidity', 'rain', 'light', 'occupancy', 'smoke', 'airquality', 'rgb', 'switch', 'relais', 'statelessswitch'];
var letters = ['A', 'B', 'C', 'D', 'E', 'F', '0', '1', '2', '3', '4', '5', '6'];

function letterToType(letter)
{
    return types[letters.indexOf(letter.toUpperCase())];
}

function typeToLetter(type)
{
    return letters[types.indexOf(type.toLowerCase())];
}

function MagicHomeGlobals() {}

MagicHomeGlobals.setHomebridge = function(homebridgeRef)
{
  	homebridge = homebridgeRef;
};

module.exports = {
	platform: MagicHome,
	globals: MagicHomeGlobals,
	pluginName: pluginName,
	platformName: platformName
};