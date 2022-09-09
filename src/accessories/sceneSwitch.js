const { SwitchService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SceneSwitch extends SwitchService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		super.setState(false, () => {});

		this.DeviceManager = manager.DeviceManager;
		this.EventManager = manager.EventManager;

		this.ips = serviceConfig.ips;
		this.shouldTurnOff = serviceConfig.shouldTurnOff || false;

		this.changeHandler = (state) => {

			if(state.value == true)
			{
				this.setState(state.value,
					() => this.service.getCharacteristic(this.Characteristic.On).updateValue(state.value));
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

			this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [triggered] ( ' + this.id + ' )');

		}).then(() => setTimeout(() => this.service.getCharacteristic(this.Characteristic.On).updateValue(false), 2000));
	
		this.EventManager.setOutputStream('resetSwitch', { sender : this }, Object.keys(this.ips));

		this.AutomationSystem.LogikEngine.runAutomation(this, { value });
	}
}