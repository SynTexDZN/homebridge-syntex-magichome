const LightBulb = require('./accessories/lightBulb');
const PresetSwitch = require('./accessories/presetSwitch');
const ResetSwitch = require('./accessories/resetSwitch');
const lightAgent = require('./lib/lightAgent');

const pluginName = 'homebridge-syntex-magichome';
const platformName = 'SynTexMagicHome';

var DeviceManager = require('../device-manager');
var logger = require('../logger');
var server = require('../webserver');

var homebridge;

function MagicHome(log, config = {}, api)
{
	this.config = config;
	this.lights = [];
	this.presetSwitches = [];
	this.resetSwitches = [];

	this.devices = config['accessories'] || [];
    
    this.cacheDirectory = config['cache_directory'] || './SynTex';
    this.logDirectory = config['log_directory'] || './SynTex/log';
    this.port = config['port'] || 1712;
    
	logger.create('SynTexMagicHome', this.logDirectory, api.user.storagePath());

	server.SETUP('SynTexMagicHome', logger, this.port);

	lightAgent.setLogger(logger);

	if(homebridge)
	{
		lightAgent.setPersistPath(homebridge.PersistPath);
	}

	if(config)
	{
		if(config.debug)
		{
			lightAgent.setVerbose();
		}

		if(config.disableDiscovery)
		{
			logger.log('info', 'bridge', 'Bridge', '** DISABLED DISCOVERY **');
			lightAgent.disableDiscovery();
		}
	}

	lightAgent.startDiscovery();
	
	DeviceManager.SETUP(logger, this.cacheDirectory);

	restart = false;
	/*
    Automations.SETUP(logger, this.cacheDirectory, DeviceManager).then(function () {

        restart = false;
	});
	*/
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

		server.addPage('/set-device', async (response, urlParams) => {
		
			if(urlParams.mac && urlParams.type)
			{
				var found = false;
	
				if(urlParams.type == 'rgb' || urlParams.type == 'rgbw')
				{
					for(var i = 0; i < this.lights.length; i++)
					{
						if(this.lights[i].mac == urlParams.mac)
						{
							found = true;
	
							if(urlParams.power)
							{
								await this.lights[i].setPowerState(urlParams.power == 'true' ? true : false, () => {});
							}
	
							if(urlParams.hue)
							{
								this.lights[i].setHue(urlParams.hue, () => {});
							}
	
							if(urlParams.saturation)
							{
								this.lights[i].setSaturation(urlParams.saturation, () => {});
							}
	
							if(urlParams.brightness)
							{
								this.lights[i].setBrightness(urlParams.brightness, () => {});
							}
						}
					}
				}
				else if(urlParams.type == 'preset-switch' || urlParams.type == 'reset-switch')
				{
					var switches = urlParams.type == 'preset-switch' ? this.presetSwitches : urlParams.type == 'reset-switch' ? this.resetSwitches : null;
	
					for(var i = 0; i < switches.length; i++)
					{
						if(switches[i].mac == urlParams.mac)
						{
							found = true;
	
							if(urlParams.power)
							{
								switches[i].switchStateChanged(urlParams.power == 'true' ? true : false, () => {});
							}
						}
					}
				}
	
				response.write(found ? 'Success' : 'Error');
			}
			else
			{
				response.write('Keine Mac angegeben!');
			}
			
			response.end();
		});
	
		server.addPage('/get-device', async (response, urlParams) => {
			
			var presets = {
				lights : '3',
				presetSwitches : '4',
				resetSwitches : '4'
			};
	
			if(urlParams.mac && urlParams.type)
			{
				var state = await DeviceManager.getDevice(urlParams.mac, presets[urlParams.type] + '0');
	
				response.write(state != null ? state.toString() : 'Error');
			}
			else
			{
				response.write('Keine Mac angegeben!');
			}
			
			response.end();
		});
	
		server.addPage('/devices', async (response, urlParams) => {
	
			if(urlParams.mac)
			{
				var accessory = null;
	
				for(var i = 0; i < accessories.length; i++)
				{
					logger.debug(accessories[i].mac + ' -> ' + urlParams.mac);

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
				else if(urlParams.value)
				{
					var state = null;
	
					if((state = validateUpdate(urlParams.mac, accessory.letters, urlParams.value)) != null)
					{
						//accessory.changeHandler(state);
						logger.debug('FOUND');
					}
					else
					{
						logger.log('error', urlParams.mac, accessory.letters, '[' + urlParams.value + '] ist kein gültiger Wert! ( ' + urlParams.mac + ' )');
					}
	
					DeviceManager.setDevice(urlParams.mac, accessory.letters, urlParams.value);
						
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
	}
}

function validateUpdate(mac, letters, state)
{
    var type = letterToType(letters[0]);

    if(type === 'motion' || type === 'rain' || type === 'smoke' || type === 'occupancy' || type === 'contact' || type == 'switch' || type == 'relais')
    {
        if(state != true && state != false && state != 'true' && state != 'false')
        {
            logger.log('warn', mac, '', 'Konvertierungsfehler: [' + state + '] ist keine boolsche Variable! ( ' + mac + ' )');

            return null;
        }

        return (state == 'true' || state == true ? true : false);
    }
    else if(type === 'light' || type === 'temperature')
    {
        if(isNaN(state))
        {
            logger.log('warn', mac, '', 'Konvertierungsfehler: [' + state + '] ist keine numerische Variable! ( ' + mac + ' )');
        }

        return !isNaN(state) ? parseFloat(state) : null;
    }
    else if(type === 'humidity' || type === 'airquality')
    {
        if(isNaN(state))
        {
            logger.log('warn', mac, '', 'Konvertierungsfehler: [' + state + '] ist keine numerische Variable! ( ' + mac + ' )');
        }

        return !isNaN(state) ? parseInt(state) : null;
    }
    else
    {
        return state;
    }
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