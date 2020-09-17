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

	server.addPage('/test', '<h1>Hallo Welt</h1>', (response) => {
		
		response.write('<h1>Hallo Welt!!!</h1>');
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