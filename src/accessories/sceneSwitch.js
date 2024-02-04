const { SwitchService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexSceneSwitchService extends SwitchService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		super.setState(false, null, false);

		this.DeviceManager = manager.DeviceManager;
		this.EventManager = manager.platform.EventManager;

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

	setState(value, callback)
	{
		var promiseArray = [];

		Object.keys(this.ips).forEach((ip) => {

			promiseArray.push(new Promise((resolve) => {
				
				// OPTIMIZE: Remove Timeout When LED is Already On

				this.DeviceManager.executeCommand([ip, '--on'], (offline, output) => {

					var failed = offline || !output.includes('Turning on');

					if(!failed)
					{
						setTimeout(() => this.DeviceManager.executeCommand([ip, '-c', this.ips[ip]], (offline, output) => {
						
							var failed = offline || !output.includes('Setting color');
	
							if(!failed && this.shouldTurnOff)
							{
								setTimeout(() => this.DeviceManager.executeCommand([ip, '--off'], (offline, output) => {
	
									var failed = offline || !output.includes('Turning off');
	
									resolve(!failed);
	
								}), 1500);
							}
							else
							{
								resolve(!failed);
							}
							
						}), 1500);
					}
					else
					{
						resolve(!failed);
					}
				});
			}));
		});

		Promise.all(promiseArray).then((result) => {

			if(result.includes(true))
			{
				callback();

				this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [triggered] ( ' + this.id + ' )');
				
				this.EventManager.setOutputStream('resetSwitch', { sender : this }, Object.keys(this.ips));

				this.AutomationSystem.LogikEngine.runAutomation(this, { value });
			}
			else
			{
				callback(new Error('Offline'));
			}

		}).then(() => setTimeout(() => this.service.getCharacteristic(this.Characteristic.On).updateValue(false), 3000));
	}
}