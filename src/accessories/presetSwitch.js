let Characteristic, DeviceManager, AutomationSystem;

const { SwitchService } = require('homebridge-syntex-dynamic-platform');

const preset = require('../presets');
const custom = require('../custom');
const emitter = require('../emitter');

module.exports = class PresetSwitch extends SwitchService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Characteristic = manager.platform.api.hap.Characteristic;
		DeviceManager = manager.DeviceManager;
		AutomationSystem = manager.AutomationSystem;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		super.getState((power) => {

			this.power = power || false;

			this.service.getCharacteristic(Characteristic.On).updateValue(this.power);

		}, true);
		
		this.ips = deviceConfig.ips;
		this.shouldTurnOff = deviceConfig.shouldTurnOff || false;
		this.preset = deviceConfig.preset || 'seven_color_cross_fade';
		this.speed = deviceConfig.speed || 40;
		this.sceneValue = preset[this.preset] || custom[this.preset];

		if(this.sceneValue == null)
		{
			this.sceneValue = 37;

			this.logger.log('warn', 'bridge', 'Bridge', '%preset_not_found[0]% [' + this.preset + '] %preset_not_found[1]% [seven_color_cross_fade] %preset_not_found[2]%!');
		}

		this.bindEmitter();

		this.changeHandler = (state) =>
		{
			if(state.value != null)
			{
				this.service.getCharacteristic(Characteristic.On).updateValue(state.value);

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
		this.power = value;

		if(value == true)
		{
			DeviceManager.executeCommand(Object.keys(this.ips), '--on', () => {

				if(preset[this.preset] != null)
				{
					setTimeout(() => DeviceManager.executeCommand(Object.keys(this.ips), '-p ' + this.sceneValue + ' ' + this.speed, 
						() => super.setState(true, () => callback(), true)), 1500);
				}
				else if(custom[this.preset] != null)
				{
					setTimeout(() => DeviceManager.executeCommand(Object.keys(this.ips), '-C ' + custom[this.preset].transition + ' ' + this.speed + ' "' + custom[this.preset].preset + '"', 
						() => super.setState(true, () => callback(), true)), 1500);
				}
			});
		}
		else
		{
			var promiseArray = [];

			Object.keys(this.ips).forEach((ip) => {

				const newPromise = new Promise((resolve) => DeviceManager.executeCommand(ip, ' -c ' + this.ips[ip], 
					() => resolve()));

				promiseArray.push(newPromise);
			});

			Promise.all(promiseArray).then(() => {

				callback();

				if(this.shouldTurnOff)
				{
					setTimeout(() => DeviceManager.executeCommand(Object.keys(this.ips), '--off', () => {}, 1500));
				}

				super.setState(false, () => {}, true);
			});
		}

		emitter.emit('SynTexMagicHomePresetTurnedOn', this.name, Object.keys(this.ips));

		AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, { value : value });
	}

	updateState(state)
	{
		if(state.power != null && this.power != state.power)
		{
			this.service.getCharacteristic(Characteristic.On).updateValue(state.power);

			this.power = state.power;

			this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [' + this.power + '] ( ' + this.id + ' )');
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