let Characteristic, DeviceManager, AutomationSystem;

const { SwitchService } = require('homebridge-syntex-dynamic-platform');

const emitter = require('../emitter');

module.exports = class SceneSwitch extends SwitchService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Characteristic = manager.platform.api.hap.Characteristic;
		DeviceManager = manager.DeviceManager;
		AutomationSystem = manager.AutomationSystem;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.ips = deviceConfig.ips;
		this.shouldTurnOff = deviceConfig.shouldTurnOff || false;

		this.changeHandler = (state) =>
		{
			if(state.value == true)
			{
				this.service.getCharacteristic(Characteristic.On).updateValue(state.value);

				this.setState(state.value, () => {});
			}
		};
	}

	getState(callback)
	{
		callback(null, false);
	}

	setState(value, callback)
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
				Object.keys(this.ips).forEach((ip) => {

					setTimeout(() => DeviceManager.executeCommand(ip, '--off', () => {}), 1500);
				});
			}

			this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [triggered] ( ' + this.id + ' )');

		}).then(() => setTimeout(() => this.service.getCharacteristic(Characteristic.On).updateValue(false), 2000));
	
		emitter.emit('SynTexMagicHomePresetTurnedOn', this.name, Object.keys(this.ips));

		AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, { value : value });
	}
}