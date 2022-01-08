const { UniversalAccessory } = require('homebridge-syntex-dynamic-platform');

const LightBulb = require('./accessories/lightBulb');
const PresetSwitch = require('./accessories/presetSwitch');
const SceneSwitch = require('./accessories/sceneSwitch');

module.exports = class SynTexUniversalAccessory extends UniversalAccessory
{
	constructor(homebridgeAccessory, deviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, manager);
	}
	
	setService(config, subtype)
	{
		var serviceConfig = { name : this.name, type : config, subtype }, service = null;

		if(config instanceof Object)
		{
			for(const i in config)
			{
				serviceConfig[i] = config[i];
			}
		}

		if(Array.isArray(this.services) && this.services.length > 1 && this.name == serviceConfig.name)
		{
			serviceConfig.name = serviceConfig.name + ' ' + serviceConfig.type[0].toUpperCase() + serviceConfig.type.substring(1);

			if((JSON.stringify(this.services).match(new RegExp(serviceConfig.type, 'g')) || []).length > 1)
			{
				var letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

				serviceConfig.name += ' ' + letters[subtype];
			}
		}

		if(serviceConfig.function == 'preset-switch')
		{
			service = new PresetSwitch(this.homebridgeAccessory, this.deviceConfig, serviceConfig, this.manager);
		}
		else if(serviceConfig.function == 'scene-switch')
		{
			service = new SceneSwitch(this.homebridgeAccessory, this.deviceConfig, serviceConfig, this.manager);
		}
		else if(serviceConfig.function == 'light')
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
		var name = 'Accessory';

		if(this.services != null)
		{
			name = this.services;
		}

		if(this.services instanceof Object && this.services.type != null)
		{
			name = this.services.type;
		}

		if(Array.isArray(this.services))
		{
			name = 'Multi Accessory';
		}

		name = name[0].toUpperCase() + name.substring(1);

		return 'Magic Home ' + name;
	}
};