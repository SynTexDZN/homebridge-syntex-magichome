const Accessory = require('./base');
const emitter = require('../lib/emitter');

module.exports = class ResetSwitch extends Accessory
{
	constructor(config, log, homebridge, manager)
	{
		super(config, log, homebridge, manager);

		this.name = config.name || 'Reset LED Controller Presets';
		this.ips = Object.keys(config.ips);

		this.letters = '40';
		/*
		this.changeHandler = (function(state)
		{
			this.logger.log('update', this.mac, this.name, 'HomeKit Status für [' + this.name + '] geändert zu [' + state + '] ( ' + this.mac + ' )');

			this.switchStateChanged(state, () => {});

		}).bind(this);
		*/
	}

	getAccessoryServices()
	{
		const switchService = new this.homebridge.Service.Switch(this.name);

		switchService.getCharacteristic(this.homebridge.Characteristic.On)
			.on('get', this.getState.bind(this))
			.on('set', this.switchStateChanged.bind(this));

		return [switchService];
	}

	sendCommand(command, callback)
	{
		this.executeCommand(this.ips, command, callback);
	}

	switchStateChanged(newState, callback)
	{
		const self = this;

		emitter.emit('MagicHomeSynTexPresetTurnedOn', self.name);

		var promiseArray = [];

		Object.keys(self.config.ips).forEach((ip) => {

			const newPromise = new Promise((resolve) => {

				self.executeCommand(ip, ' -c ' + self.config.ips[ip], () => {

					resolve();
				});
			});

			promiseArray.push(newPromise);
		});

		Promise.all(promiseArray).then(() => {

			setTimeout(() => {

				self.sendCommand('--off', () => {

					callback();
				});
			}, 3000);
		}).then(() => {

			setTimeout(() => {

				self.updateState();
			}, 2000);
		});
	}

	updateState()
	{
		this.services[0].getCharacteristic(this.homebridge.Characteristic.On).updateValue(false);
	}

	getState(callback)
	{
		callback(null, false);
	}

	getModelName()
	{
		return 'Magic Home Reset Switch';
	}
}