let Characteristic;

const SwitchService = require('./switch');
const emitter = require('../lib/emitter');

module.exports = class SceneSwitch extends SwitchService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Characteristic = manager.platform.api.hap.Characteristic;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.ips = Object.keys(deviceConfig.ips);
		this.shouldTurnOff = deviceConfig.shouldTurnOff || false;
		
		this.changeHandler = (state) =>
        {
            if(state.power != null)
            {
				this.setState(state.power, () => {});
            }
        };
	}

	getState(callback)
	{
		callback(null, false);
	}

	setState(state, callback)
	{
		emitter.emit('SynTexMagicHomePresetTurnedOn', this.name);

		var promiseArray = [];

		Object.keys(this.deviceConfig.ips).forEach((ip) => {

			const newPromise = new Promise((resolve) => {

				this.executeCommand(ip, ' -c ' + this.deviceConfig.ips[ip], () => resolve());
			});

			promiseArray.push(newPromise);
		});

		Promise.all(promiseArray).then(() => {

			if(this.shouldTurnOff)
			{
				setTimeout(() => this.executeCommand(this.ips, '--off', () => {}), 3000);
			}
			
			this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [activated] ( ' + this.id + ' )');

			callback();

		}).then(() => setTimeout(() => this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.On).updateValue(false), 2000));
	}
}