const { SwitchService } = require('homebridge-syntex-dynamic-platform');

const preset = require('../presets'), custom = require('../custom'), emitter = require('../emitter');

let DeviceManager;

module.exports = class PresetSwitch extends SwitchService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		DeviceManager = manager.DeviceManager;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		super.getState((power) => {

			this.power = power || false;

			this.service.getCharacteristic(this.Characteristic.On).updateValue(this.power);

		}, true);
		
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

		this.changeHandler = (state) =>
		{
			if(state.value != null)
			{
				this.service.getCharacteristic(this.Characteristic.On).updateValue(state.value);

				this.setState(state.value, () => {});
			}
		};
	}

	getState(callback)
	{
		super.getState((value) => {

			if(value != null)
			{
				this.power = value;
			}

			callback(null, this.power);

		}, true);
	}

	setState(value, callback)
	{
		var promiseArray = [];

		this.power = value;

		if(value == true)
		{
			Object.keys(this.ips).forEach((ip) => {

				const newPromise = new Promise((resolve) => DeviceManager.executeCommand(ip, '--on', 
					() => resolve()));

				promiseArray.push(newPromise);

				// OPTIMIZE: Remove Timeout When LED is Already On

				if(preset[this.preset] != null)
				{
					const newPresetPromise = new Promise((resolve) => setTimeout(() => DeviceManager.executeCommand(ip, '-p ' + this.sceneValue + ' ' + this.speed, 
						() => resolve()), 1500));

					promiseArray.push(newPresetPromise);
				}
				else if(custom[this.preset] != null)
				{
					const newPresetPromise = new Promise((resolve) => setTimeout(() => DeviceManager.executeCommand(ip, '-C ' + custom[this.preset].transition + ' ' + this.speed + ' "' + custom[this.preset].preset + '"',
						() => resolve()), 1500));

					promiseArray.push(newPresetPromise);
				}
			});

			Promise.all(promiseArray).then(() => super.setState(true, () => callback(), true));
		}
		else
		{
			Object.keys(this.ips).forEach((ip) => {

				const newPromise = new Promise((resolve) => DeviceManager.executeCommand(ip, ' -c ' + this.ips[ip], 
					() => resolve()));

				promiseArray.push(newPromise);
			});

			Promise.all(promiseArray).then(() => {

				callback();

				if(this.shouldTurnOff)
				{
					Object.keys(this.ips).forEach((ip) => {

						setTimeout(() => DeviceManager.executeCommand(ip, '--off', () => {}), 1500);
					});
				}

				super.setState(false, () => {}, true);
			});
		}

		emitter.emit('SynTexMagicHomePresetTurnedOn', this.name, Object.keys(this.ips));

		this.AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, { value });
	}

	updateState(state)
	{
		if(state.power != null && !isNaN(state.power) && this.power != state.power)
		{
			this.service.getCharacteristic(this.Characteristic.On).updateValue(state.power);

			this.power = state.power;

			this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [' + state.power + '] ( ' + this.id + ' )');
		}

		super.setState(state.power, () => {});
	}

	bindEmitter()
	{
		emitter.on('SynTexMagicHomePresetTurnedOn', (presetName, ips) => {

			if(presetName != this.name)
			{
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
					this.updateState({ power : false });
				}
			}
		});
	}
}