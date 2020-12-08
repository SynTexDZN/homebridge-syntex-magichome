let Service, Characteristic, DeviceManager;

const { ColoredBulbService } = require('homebridge-syntex-dynamic-platform');

const convert = require('color-convert');
const emitter = require('../emitter');

module.exports = class LightBulb extends ColoredBulbService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Service = manager.platform.api.hap.Service;
		Characteristic = manager.platform.api.hap.Characteristic;
		DeviceManager = manager.DeviceManager;

		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.ip = deviceConfig.ip;
		this.purewhite = deviceConfig.purewhite || false;
		this.timeout = deviceConfig.timeout || 60000;

		this.updateState();

		this.changeHandler = (state, refreshDevices) =>
		{
			if(state.hue != null)
			{
				this.setHue(state.hue, () => {});

				homebridgeAccessory.getServiceById(Service.Lightbulb, serviceConfig.subtype).getCharacteristic(Characteristic.Hue).updateValue(this.hue);
			}

			if(state.saturation != null)
			{
				this.setSaturation(state.saturation, () => {});

				homebridgeAccessory.getServiceById(Service.Lightbulb, serviceConfig.subtype).getCharacteristic(Characteristic.Saturation).updateValue(this.saturation);
			}

			if(state.brightness != null)
			{
				this.setBrightness(state.brightness, () => {});

				homebridgeAccessory.getServiceById(Service.Lightbulb, serviceConfig.subtype).getCharacteristic(Characteristic.Brightness).updateValue(this.brightness);
			}

			if(state.power != null)
			{
				this.setState(state.power, () => {});

				homebridgeAccessory.getServiceById(Service.Lightbulb, serviceConfig.subtype).getCharacteristic(Characteristic.On).updateValue(this.power);
			}
		};
	}

	startTimer()
	{
		if(this.timeout == 0) return;

		setTimeout(() => this.updateState(), this.timeout);
	}

	updateState()
	{
		this.logger.debug('Polling Light ' + this.ip);

		DeviceManager.getDevice(this.ip, (settings) => {

			var changed = false;

			if(this.power != settings.power)
			{
				this.power = settings.power;

				this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.On).updateValue(this.power);

				changed = true;
			}

			if(this.hue != settings.hue)
			{
				this.hue = settings.hue;

				this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.Hue).updateValue(this.hue);

				changed = true;
			}

			if(this.saturation != settings.saturation)
			{
				this.saturation = settings.saturation;

				this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.Saturation).updateValue(this.saturation);

				changed = true;
			}

			if(this.brightness != settings.brightness)
			{
				this.brightness = settings.brightness;

				this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.Brightness).updateValue(this.brightness);

				changed = true;
			}
			
			super.setState(settings.power, () => {});
			super.setHue(settings.hue, () => {});
			super.setSaturation(settings.saturation, () => {});
			super.setBrightness(settings.brightness, () => {});

			if(changed)
			{
				this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
			}

			this.startTimer();
		});
	}

	getState(callback)
	{
		super.getState((value) => {

			if(value != null)
			{
				this.power = value;

				this.logger.log('read', this.id, this.letters, 'HomeKit Status für [' + this.name + '] ist [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');

				callback(null, this.power);
			}
			else
			{
				DeviceManager.getDevice(this.id).then((state) => {

					if(state != null)
					{
						this.power = state.power;

						this.logger.log('read', this.id, this.letters, 'HomeKit Status für [' + this.name + '] ist [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
					
						super.setValue('state', this.power);
					}
					
					callback(null, state != null && state.power != null ? state.power : false);
				});
			}
		});
	}

	setState(value, callback)
	{
		var delay = (!this.power);

		this.power = value;

		DeviceManager.executeCommand(this.ip, value ? '--on' : '--off', () => {

			super.setState(value, () => {

				emitter.emit('SynTexMagicHomePresetTurnedOn', this.name, [ this.ip ]);

				this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');

				setTimeout(() => this.setToCurrentColor(), delay ? 1000 : 0);

				callback();
			});
		});
	}

	getHue(callback)
	{
		super.getHue((value) => {

			if(value != null)
			{
				this.hue = value;

				callback(null, this.hue);
			}
			else
			{
				DeviceManager.getDevice(this.id).then((state) => {

					if(state != null)
					{
						this.hue = state.hue;
					
						super.setValue('state', this.hue);
					}
					
					callback(null, state != null && state.hue != null ? state.hue : 0);
				});
			}
		});
	}

	setHue(value, callback)
	{
		this.hue = value;

		super.setHue(value, () => {

			callback();
		});
	}

	getSaturation(callback)
	{
		super.getSaturation((value) => {

			if(value != null)
			{
				this.saturation = value;

				callback(null, this.saturation);
			}
			else
			{
				DeviceManager.getDevice(this.id).then((state) => {

					if(state != null)
					{
						this.saturation = state.saturation;

						super.setValue('state', this.saturation);
					}
					
					callback(null, state != null && state.saturation != null ? state.saturation : 100);
				});
			}
		});
	}

	setSaturation(value, callback)
	{
		this.saturation = value;

		super.setSaturation(value, () => {

			callback();
		});
	}

	getBrightness(callback)
	{
		super.getBrightness((value) => {

			if(value != null)
			{
				this.brightness = value;

				callback(null, this.brightness);
			}
			else
			{
				DeviceManager.getDevice(this.id).then((state) => {

					if(state != null)
					{
						this.brightness = state.brightness;

						super.setValue('state', this.brightness);
					}
					
					callback(null, state != null && state.brightness != null ? state.brightness : 50);
				});
			}
		});
	}

	setBrightness(value, callback)
	{
		this.brightness = value;

		super.setBrightness(value, () => {

			callback();
		});
	}

	setToWarmWhite()
	{
		DeviceManager.executeCommand(this.ip, '-w ' + this.brightness);
	}

	setToCurrentColor()
	{
		if(this.saturation === 0 && this.hue === 0 && this.purewhite)
		{
			this.setToWarmWhite();
			return;
		}

		var converted = convert.hsv.rgb([this.hue, this.saturation, this.brightness]);
		var setup = this.services == 'rgb' ? 'RGBW' : this.services == 'rgbw' ? 'RGBWW' : 'RGBW';
		var base = '-x ' + setup + ' -c ';

		DeviceManager.executeCommand(this.ip, base + converted[0] + ',' + converted[1] + ',' + converted[2]);
	}
}