const { UniversalAccessory } = require('homebridge-syntex-dynamic-platform');
const LightBulb = require('./accessories/lightBulb');
const PresetSwitch = require('./accessories/presetSwitch');
const SceneSwitch = require('./accessories/sceneSwitch');

var accessoryType;

module.exports = class SynTexUniversalAccessory extends UniversalAccessory
{
	constructor(homebridgeAccessory, deviceConfig, manager)
	{
		accessoryType = deviceConfig.type;

		super(homebridgeAccessory, deviceConfig, manager);
	}
	
	setService(config, subtype)
	{
		var name = this.name;
		var type = config;

		if(config instanceof Object)
		{
			if(config.name != null)
			{
				name = config.name;
			}
			
			if(config.type != null)
			{
				type = config.type;
			}
		}

		var service = null;
		var serviceConfig = { name : name, type : type, subtype : subtype };

		if(accessoryType == 'preset-switch')
		{
			service = new PresetSwitch(this.homebridgeAccessory, this.deviceConfig, serviceConfig, this.manager);
		}
		else if(accessoryType == 'scene-switch')
		{
			service = new SceneSwitch(this.homebridgeAccessory, this.deviceConfig, serviceConfig, this.manager);
		}
		else if(accessoryType == 'light')
		{
			service = new LightBulb(this.homebridgeAccessory, this.deviceConfig, serviceConfig, this.manager);
		}

		if(service != null)
		{
			this.service.push(service);
		}
	}
	
	getModel()
	{
		return 'Magic Home ' + (accessoryType == 'light' ? 'Light Bulb' : accessoryType == 'preset-switch' ? 'Preset Switch' : accessoryType == 'scene-switch' ? 'Scene Switch' : 'Accessory');
	}
};