const { SwitchService } = require('homebridge-syntex-dynamic-platform');

const preset = require('../presets'), custom = require('../custom');

module.exports = class PresetSwitch extends SwitchService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.DeviceManager = manager.DeviceManager;
		this.EventManager = manager.platform.EventManager;

		this.ips = serviceConfig.ips;
		this.shouldTurnOff = serviceConfig.shouldTurnOff || false;
		this.preset = serviceConfig.preset || 'seven_color_cross_fade';
		this.speed = serviceConfig.speed || 40;
		this.sceneValue = preset[this.preset] || custom[this.preset];

		if(this.sceneValue == null)
		{
			this.sceneValue = 37;

			this.logger.log('warn', this.id, this.letters, '%preset_not_found[0]% [' + this.preset + '] %preset_not_found[1]% [seven_color_cross_fade] %preset_not_found[2]%!');
		}

		this.bindEmitter();

		this.changeHandler = (state) => {

			if(state.value != null)
			{
				this.setState(state.value,
					() => this.service.getCharacteristic(this.Characteristic.On).updateValue(state.value));
			}
		};
	}

	getState(callback)
	{
		super.getState((value) => {

			this.value = value;

			callback(null, value);

		}, true);
	}

	setState(value, callback)
	{
		var promiseArray = [];

		this.value = value;

		if(value == true)
		{
			Object.keys(this.ips).forEach((ip) => {

				promiseArray.push(new Promise((resolve) => {
					
					this.DeviceManager.executeCommand(ip, '--on', () => resolve());
				}));

				// OPTIMIZE: Remove Timeout When LED is Already On

				if(preset[this.preset] != null)
				{
					promiseArray.push(new Promise((resolve) => {
						
						setTimeout(() => this.DeviceManager.executeCommand(ip, '-p ' + this.sceneValue + ' ' + this.speed, () => resolve()), 1500);
					}));
				}
				else if(custom[this.preset] != null)
				{
					promiseArray.push(new Promise((resolve) => {
						
						setTimeout(() => this.DeviceManager.executeCommand(ip, '-C ' + custom[this.preset].transition + ' ' + this.speed + ' "' + custom[this.preset].preset + '"', () => resolve()), 1500);
					}));
				}
			});

			Promise.all(promiseArray).then(() => super.setState(true, () => callback(), true));
		}
		else
		{
			Object.keys(this.ips).forEach((ip) => {

				promiseArray.push(new Promise((resolve) => {
					
					this.DeviceManager.executeCommand(ip, ' -c ' + this.ips[ip], () => resolve());
				}));
			});

			Promise.all(promiseArray).then(() => {

				callback();

				if(this.shouldTurnOff)
				{
					Object.keys(this.ips).forEach((ip) => {

						setTimeout(() => this.DeviceManager.executeCommand(ip, '--off', () => {}), 1500);
					});
				}

				super.setState(false, () => {}, true);
			});
		}

		this.EventManager.setOutputStream('resetSwitch', { sender : this }, Object.keys(this.ips));

		this.AutomationSystem.LogikEngine.runAutomation(this, { value });
	}

	updateState(state)
	{
		if(state.value != null && !isNaN(state.value) && (!super.hasState('value') || this.value != state.value))
		{
			this.value = state.value;

			super.setState(state.value,
				() => this.service.getCharacteristic(this.Characteristic.On).updateValue(state.value), true);
		}

		this.AutomationSystem.LogikEngine.runAutomation(this, state);
	}

	bindEmitter()
	{
		this.EventManager.setInputStream('resetSwitch', { source : this, destination : this.id }, (ips) => {

			var updateState = false;

			for(const ip of ips)
			{
				if(Object.keys(this.ips).includes(ip))
				{
					updateState = true;
				}
			}

			if(updateState)
			{
				this.updateState({ value : false });
			}
		});
	}
}