const Accessory = require('./base');
const preset = require('../presets');
const emitter = require('../lib/emitter');

module.exports = class PresetSwitch extends Accessory
{
	constructor(config, log, homebridge, manager)
	{
		super(config, log, homebridge, manager);

		this.isOn = false;
		this.name = config.name || 'LED Controller Presets';
		this.ips = Object.keys(config.ips);
		this.preset = config.preset || 'seven_color_cross_fade';
		this.sceneValue = preset[this.preset];

		this.letters = '40';

		if(this.sceneValue == null)
		{
			this.logger.log('warn', 'bridge', 'Bridge', 'Das Preset [' + this.preset + '] wurde nicht gefunden. Es wird das Default-Preset [seven_color_cross_fade] verwendet!');
			this.sceneValue = 37;
		}

		this.speed = config.speed || 40;
		this.shouldTurnOff = config.shouldTurnOff || true;
		this.bindEmitter();

		this.changeHandler = (function(state)
		{
			this.switchStateChanged(state, () => {});

		}).bind(this);

		this.DeviceManager.getDevice(this.mac, this.letters).then(function(state) {

			if(state == null)
			{
				this.logger.log('error', this.mac, this.letters, '[' + this.name + '] wurde nicht in der Storage gefunden! ( ' + this.mac + ' )');
			}
			else if(state != null)
			{
				this.logger.log('read', this.mac, this.letters, 'HomeKit Status für [' + this.name + '] ist [' + state + '] ( ' + this.mac + ' )');

				this.isOn = state;

				this.service[0].getCharacteristic(this.homebridge.Characteristic.On).updateValue(this.isOn);
			}

		}.bind(this));
	}

	bindEmitter()
	{
		const self = this;

		emitter.on('MagicHomeSynTexPresetTurnedOn', (presetName) => {

			if(presetName !== self.name)
			{
				self.updateState(false);
			}
		})
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
		this.isOn = newState;

		this.logger.log('update', this.mac, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [' + newState + '] ( ' + this.mac + ' )');

		const self = this;

		if(newState === true)
		{
			// Turn Off Other Running Scenes
			emitter.emit('MagicHomeSynTexPresetTurnedOn', self.name);

			self.sendCommand('--on', () => {

				setTimeout(() => {

					self.sendCommand('-p ' + self.sceneValue + ' ' + self.speed, () => {

						this.DeviceManager.setDevice(self.mac, self.letters, true);

						callback();
					});

				}, 3000);
			});
		}
		else
		{
			// Turning OFF
			var promiseArray = [];

			Object.keys(self.config.ips).forEach((ip) => {

				const newPromise = new Promise((resolve) => {

					self.executeCommand(ip, ' -c ' + self.config.ips[ip], () => {

						this.DeviceManager.setDevice(self.mac, self.letters, false);

						resolve();
					});
				});

				promiseArray.push(newPromise);
			});

			Promise.all(promiseArray).then(() => {

				if(self.shouldTurnOff)
				{
					setTimeout(() => {

						self.sendCommand('--off', () => {

							callback();
						});

					}, 3000);
				}
				else
				{
					callback();
				}
			});
		}
	}

	updateState(newValue)
	{
		this.isOn = newValue;
		this.service[0].getCharacteristic(this.homebridge.Characteristic.On).updateValue(this.isOn);
		this.DeviceManager.setDevice(this.mac, this.letters, this.isOn);
	}

	getState(callback)
	{
		this.DeviceManager.getDevice(this.mac, this.letters).then(function(state) {

			this.logger.log('read', this.mac, this.letters, 'HomeKit Status für [' + this.name + '] ist [' + state + '] ( ' + this.mac + ' )');

			callback(null, state);
	
		}.bind(this)).catch(function(e) {
	
			this.logger.err(e);
			
		}.bind(this));
	}
}