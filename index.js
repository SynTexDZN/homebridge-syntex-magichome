let DeviceManager = require('./device-manager');

const { DynamicPlatform } = require('homebridge-syntex-dynamic-platform');

const SynTexUniversalAccessory = require('./src/universal');

const pluginID = 'homebridge-syntex-magichome';
const pluginName = 'SynTexMagicHome';

var restart = true;

module.exports = (homebridge) => {

	homebridge.registerPlatform(pluginID, pluginName, SynTexMagicHomePlatform, true);
};

class SynTexMagicHomePlatform extends DynamicPlatform
{
	constructor(log, config, api)
	{
		super(config, api, pluginID, pluginName);
		
		this.devices = config['accessories'] || [];

		this.pollingInterval = config['pollingInterval'] == 0 ? 0 : config['pollingInterval'] || 10;
		
		if(this.api && this.logger)
		{
			this.api.on('didFinishLaunching', () => {

				DeviceManager = new DeviceManager(this.logger);
				
				const { exec } = require('child_process');
						
				exec('sudo chmod 777 -R /usr/local/lib/node_modules/' + pluginID + '/src/flux_led.py', (error, stdout, stderr) => {

					if(error)
					{
						this.logger.log('error', 'bridge', 'Bridge', '[flux_led.py] konnte nicht aktiviert werden!');
					}
				});

				this.initWebServer();

				this.loadAccessories();

				DeviceManager.refreshAccessories(this.accessories);
				
				if(this.pollingInterval != 0)
				{
					this.refreshInterval = setInterval(() => {

						DeviceManager.refreshAccessories(this.accessories);
		
					}, this.pollingInterval * 1000);
				}
				
				restart = false;
			});
		}
	}

	initWebServer()
	{
		this.WebServer.addPage('/devices', async (response, urlParams) => {

			if(urlParams.id != null)
			{
				var accessory = this.getAccessory(urlParams.id);

				if(accessory == null)
				{
					this.logger.log('error', urlParams.id, '', 'Es wurde kein passendes Gerät in der Config gefunden! ( ' + urlParams.id + ' )');

					response.write('Error');
				}
				else if(urlParams.value != null)
				{
					var state = { power : urlParams.value };

					if(urlParams.hue != null)
					{
						state.hue = urlParams.hue;
					}
					
					if(urlParams.saturation != null)
					{
						state.saturation = urlParams.saturation;
					}

					if(urlParams.brightness != null)
					{
						state.brightness = urlParams.brightness;
					}

					if((state = this.validateUpdate(urlParams.id, accessory.service[1].letters, state)) != null)
					{
						accessory.service[1].changeHandler(state);
					}
					else
					{
						this.logger.log('error', urlParams.id, accessory.service[1].letters, '[' + accessory.name + '] konnte nicht aktualisiert werden! ( ' + urlParams.id + ' )');
					}

					response.write(state != null ? 'Success' : 'Error');
				}
				else if(urlParams.remove != null)
				{
					if(urlParams.remove == 'CONFIRM')
					{
						this.removeAccessory(accessory.homebridgeAccessory);
					}

					response.write(urlParams.remove == 'CONFIRM' ? 'Success' : 'Error');
				}
				else
				{
					var state = null;
					
					if(accessory.homebridgeAccessory != null
						&& accessory.homebridgeAccessory.context != null
						&& accessory.homebridgeAccessory.context.data != null
						&& accessory.service[1] != null
						&& accessory.service[1].letters != null)
					{
						state = accessory.homebridgeAccessory.context.data[accessory.service[1].letters];
					}

					response.write(state != null ? JSON.stringify(state) : 'Error');
				}
			}
			else
			{
				response.write('Error');
			}

			response.end();
		});

		this.WebServer.addPage('/accessories', (response) => {
	
			var accessories = [];

			for(const accessory of this.accessories)
			{
				accessories.push({
					id: accessory[1].id,
					name: accessory[1].name,
					services: accessory[1].services,
					version: '99.99.99',
					plugin: pluginName
				});
			}
	
			response.write(JSON.stringify(accessories));
			response.end();
		});

		this.WebServer.addPage('/serverside/version', (response) => {

			response.write(require('./package.json').version);
			response.end();
		});

		this.WebServer.addPage('/serverside/check-restart', (response) => {

			response.write(restart.toString());
			response.end();
		});

		this.WebServer.addPage('/serverside/update', (response, urlParams) => {

			var version = urlParams.version != null ? urlParams.version : 'latest';

			const { exec } = require('child_process');

			exec('sudo npm install ' + pluginID + '@' + version + ' -g', (error, stdout, stderr) => {

				response.write(error || (stderr && stderr.includes('ERR!')) ? 'Error' : 'Success');
				response.end();

				if(error || (stderr && stderr.includes('ERR!')))
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
			});
		});
	}

	loadAccessories()
	{
		for(const device of this.devices)
		{
			const homebridgeAccessory = this.getAccessory(device.id);

			this.addAccessory(new SynTexUniversalAccessory(homebridgeAccessory, device, { platform : this, logger : this.logger, DeviceManager : DeviceManager }));
		}
	}

	validateUpdate(id, letters, state)
	{
		var data = {
			A : { type : 'contact', format : 'boolean' },
			B : { type : 'motion', format : 'boolean' },
			C : { type : 'temperature', format : 'number' },
			D : { type : 'humidity', format : 'number' },
			E : { type : 'rain', format : 'boolean' },
			F : { type : 'light', format : 'number' },
			0 : { type : 'occupancy', format : 'boolean' },
			1 : { type : 'smoke', format : 'boolean' },
			2 : { type : 'airquality', format : 'number' },
			3 : { type : 'rgb', format : { power : 'boolean', brightness : 'number', saturation : 'number', hue : 'number' } },
			4 : { type : 'switch', format : 'boolean' },
			5 : { type : 'relais', format : 'boolean' },
			6 : { type : 'statelessswitch', format : 'number' },
			7 : { type : 'outlet', format : 'boolean' },
			8 : { type : 'led', format : 'boolean' },
			9 : { type : 'dimmer', format : { power : 'boolean', brightness : 'number' } }
		};

		for(const i in state)
		{
			try
			{
				state[i] = JSON.parse(state[i]);
			}
			catch(e)
			{
				this.logger.log('warn', id, letters, 'Konvertierungsfehler: [' + state[i] + '] konnte nicht gelesen werden! ( ' + id + ' )');

				return null;
			}
			
			var format = data[letters[0].toUpperCase()].format;

			if(format instanceof Object)
			{
				format = format[i];
			}

			if(typeof state[i] != format)
			{
				this.logger.log('warn', id, letters, 'Konvertierungsfehler: [' + state[i] + '] ist keine ' + (format == 'boolean' ? 'boolsche' : format == 'number' ? 'numerische' : 'korrekte') + ' Variable! ( ' + id + ' )');

				return null;
			}
		}

		return state;
	}
}