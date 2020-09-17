const LightBulb = require('./accessories/lightBulb');
const PresetSwitch = require('./accessories/presetSwitch');
const ResetSwitch = require('./accessories/resetSwitch');
const lightAgent = require('./lib/lightAgent');

const pluginName = 'homebridge-syntex-magichome';
const platformName = 'SynTexMagicHome';

var logger = require('../logger');
var server = require('../webserver');

var homebridge;

function MagicHome(log, config = {}, api)
{
	this.log = log;
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

	server.addPage('/test', (response, params) => {
		
		if(params.id)
		{
			if(Array.isArray(params.id))
			{
				response.write('Mehrere IDs!');
			}
			else
			{
				response.write('Deine ID lautet: ' + params.id);
			}
		}
		else
		{
			response.write('Keine ID!');
		}
		
		response.end();
	});

	server.addPage('/set-device', (response, params) => {
		
		if(params.ip)
		{
			var found = false;

			for(var i = 0; i < this.lights.length; i++)
			{
				if(this.lights[i].ip == params.ip)
				{
					found = true;

					if(params.power)
					{
						this.lights[i].setPowerState(params.power == 'true' ? true : false, () => {});
					}

					if(params.hue)
					{
						this.lights[i].setHue(params.hue, () => {});
					}

					if(params.saturation)
					{
						this.lights[i].setSaturation(params.saturation, () => {});
					}

					if(params.brightness)
					{
						this.lights[i].setBrightness(params.brightness, () => {});
					}
				}
			}

			response.write(found ? 'Success' : 'Error');
		}
		else
		{
			response.write('Keine IP angegeben!');
		}
		
		response.end();
	});

	server.addPage('/get-device', (response, params) => {
		
		if(params.ip)
		{
			var found = null;

			for(var i = 0; i < this.lights.length; i++)
			{
				if(this.lights[i].ip == params.ip)
				{
					found = this.lights[i].isOn + ':' + this.lights[i].color.H + ':' + this.lights[i].color.S + ':' + this.lights[i].color.L + ':';
				}
			}

			response.write(found != null ? found : 'Error');
		}
		else
		{
			response.write('Keine IP angegeben!');
		}
		
		response.end();
	});
	
	lightAgent.setLogger(logger);

	// Set Cache Storage Path
	if(homebridge)
	{
		lightAgent.setPersistPath(homebridge.PersistPath);
	}

	// Configure LightAgent
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
	/*
    DeviceManager.SETUP(logger, this.cacheDirectory);
    Automations.SETUP(logger, this.cacheDirectory, DeviceManager).then(function () {

        restart = false;
	});
	*/
}

MagicHome.prototype = {

	accessories: function(callback)
	{
		homebridge.debug = this.config.debug || false;

		if(this.config.lights != null && this.config.lights.length > 0)
		{
			this.config.lights.forEach((lightConfig) => {

				var newLightConfig = lightConfig;

				newLightConfig.debug = this.config.debug || false;

				this.lights.push(new LightBulb(newLightConfig, this.log, homebridge));
			});
		}

		if(this.config.presetSwitches != null && this.config.presetSwitches.length > 0)
		{
			this.config.presetSwitches.forEach((switchConfig) => {

				this.presetSwitches.push(new PresetSwitch(switchConfig, this.log, homebridge));
			});
		}

		if(this.config.resetSwitch != null)
		{
			this.resetSwitches.push(new ResetSwitch(this.config.resetSwitch, this.log, homebridge));
		}

		const lightsSwitches = this.lights.concat(this.presetSwitches);
		const allSwitches = lightsSwitches.concat(this.resetSwitches);

		callback(allSwitches);
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