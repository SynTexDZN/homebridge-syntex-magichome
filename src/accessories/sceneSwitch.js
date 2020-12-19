let Characteristic, DeviceManager;

const { SwitchService } = require('homebridge-syntex-dynamic-platform');

const emitter = require('../emitter');

module.exports = class SceneSwitch extends SwitchService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Characteristic = manager.platform.api.hap.Characteristic;
		DeviceManager = manager.DeviceManager;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.ips = deviceConfig.ips;
		this.shouldTurnOff = deviceConfig.shouldTurnOff || false;

		this.changeHandler = (state) =>
		{
			if(state.power == true)
			{
				this.service.getCharacteristic(Characteristic.On).updateValue(state.power);

				this.setState(state.power, () => {});
			}
		};
	}

	getState(callback)
	{
		callback(null, false);
	}

	setState(value, callback)
	{
		emitter.emit('SynTexMagicHomePresetTurnedOn', this.name, Object.keys(this.ips));

		var promiseArray = [];

		Object.keys(this.ips).forEach((ip) => {

			const newPromise = new Promise((resolve) => DeviceManager.executeCommand(ip, ' -c ' + this.ips[ip], 
				() => resolve()));

			promiseArray.push(newPromise);
		});

		Promise.all(promiseArray).then(() => {

			if(this.shouldTurnOff)
			{
				setTimeout(() => DeviceManager.executeCommand(Object.keys(this.ips), '--off', () => {}), 3000);
			}
			
			this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [triggered] ( ' + this.id + ' )');

			callback();

		}).then(() => setTimeout(() => this.service.getCharacteristic(Characteristic.On).updateValue(false), 2000));
	}
}