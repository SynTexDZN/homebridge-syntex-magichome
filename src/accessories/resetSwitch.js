let Characteristic;

const { SwitchService } = require('homebridge-syntex-dynamic-platform');
const emitter = require('../lib/emitter');

module.exports = class ResetSwitch extends SwitchService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Characteristic = manager.platform.api.hap.Characteristic;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.ips = Object.keys(config.ips);
		
		this.changeHandler = async (state) =>
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

		Object.keys(this.config.ips).forEach((ip) => {

			const newPromise = new Promise((resolve) => {

				this.executeCommand(ip, ' -c ' + this.config.ips[ip], () => resolve());
			});

			promiseArray.push(newPromise);
		});

		Promise.all(promiseArray).then(() => {

			this.logger.log('update', this.mac, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [true] ( ' + this.mac + ' )');

			setTimeout(() => this.sendCommand('--off', () => callback()), 3000);

		}).then(() => setTimeout(() => this.updateState(), 2000));
	}

	updateState()
	{
		this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.On).updateValue(false);
	}

	sendCommand(command, callback)
	{
		this.executeCommand(this.ips, command, callback);
	}
}