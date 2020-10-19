const Accessory = require('./base');
const preset = require('../presets');
const emitter = require('../lib/emitter');

var logger = null, DeviceManager = null;

const PresetSwitch = class extends Accessory
{
	constructor(config, log, homebridge, manager)
	{
		super(config, log, homebridge, manager);

		logger = log;
		DeviceManager = manager;

		this.isOn = false;
		this.name = config.name || 'LED Controller Presets';
		this.ips = Object.keys(config.ips);
		this.preset = config.preset || 'seven_color_cross_fade';
		this.sceneValue = preset[this.preset];

		this.letters = '40';

		if(this.sceneValue == null)
		{
			log.log('warn', 'bridge', 'Bridge', 'Present Not Found... Try Different Preset');
			this.sceneValue = 37;
		}

		this.speed = config.speed || 40;
		// Should Turn Off Light When Turn Off Preset
		this.shouldTurnOff = config.shouldTurnOff || true;
		this.bindEmitter();

		this.changeHandler = (function(state)
		{
			logger.log('update', this.mac, this.name, 'HomeKit Status für [' + this.name + '] geändert zu [' + state + '] ( ' + this.mac + ' )');

			//this.service.getCharacteristic(this.homebridge.Characteristic.On).updateValue(state);

			this.switchStateChanged(state, () => {});

		}).bind(this);
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

		const self = this;

		if(newState === true)
		{
			// Turn Off Other Running Scenes
			emitter.emit('MagicHomeSynTexPresetTurnedOn', self.name);

			self.sendCommand('--on', () => {

				setTimeout(() => {

					self.sendCommand('-p ' + self.sceneValue + ' ' + self.speed, () => {

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
		this.services[0].getCharacteristic(this.homebridge.Characteristic.On).updateValue(this.isOn);

		DeviceManager.setDevice(this.mac, '40', this.isOn);
	}

	getState(callback)
	{
		DeviceManager.getDevice(this.mac, '40').then(function(state) {

			callback(null, state);
	
		}.bind(this)).catch(function(e) {
	
			logger.err(e);
		});
	}

	getModelName()
	{
		return 'Preset Switch';
	}

	getSerialNumber()
	{
		return '00-001-PresetSwitch';
	}
}

module.exports = PresetSwitch;