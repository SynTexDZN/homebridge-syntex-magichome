const Accessory = require('./base')
const emitter = require('../lib/emitter')

const ResetSwitch = class extends Accessory
{
	constructor(config, log, homebridge)
	{
		super(config, log, homebridge);

		this.name = config.name || 'Reset LED Controller Presets';
		this.ips = Object.keys(config.ips);
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

		emitter.emit('MagicHomePresetTurnedOn', self.name);

		var promiseArray = [];

		Object.keys(self.config.ips).forEach(function(ip)
		{
			const newPromise = new Promise(function(resolve)
			{
				self.executeCommand(ip, ' -c ' + self.config.ips[ip], function()
				{
					resolve();
				});
			});

			promiseArray.push(newPromise);
		})

		Promise.all(promiseArray).then(function()
		{
			setTimeout(function()
			{
				self.sendCommand('--off', function()
				{
					callback();
				});
			}, 3000);
		}).then(function()
		{
			setTimeout(function()
			{
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
		return 'Reset Switch';
	}

	getSerialNumber()
	{
		return '00-001-ResetSwitch';
	}
}

module.exports = ResetSwitch;