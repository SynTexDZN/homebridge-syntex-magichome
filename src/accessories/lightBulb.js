let Service, Characteristic, DeviceManager;

const { ColoredBulbService } = require('homebridge-syntex-dynamic-platform');

const convert = require('color-convert');
const emitter = require('../lib/emitter');

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

		setTimeout(() => this.updateState(), 3000);

		this.changeHandler = async (state, refreshDevices) =>
        {
			if(state.hue != null)
            {
				this.hue = state.hue;

				this.setHue(this.hue, () => {});

				homebridgeAccessory.getServiceById(Service.Lightbulb, serviceConfig.subtype).getCharacteristic(Characteristic.Hue).updateValue(this.hue);
			}

			if(state.saturation != null)
            {
				this.saturation = state.saturation;

				this.setSaturation(this.saturation, () => {});

				homebridgeAccessory.getServiceById(Service.Lightbulb, serviceConfig.subtype).getCharacteristic(Characteristic.Saturation).updateValue(this.saturation);
			}

			if(state.brightness != null)
            {
				this.brightness = state.brightness;

				this.setBrightness(this.brightness, () => {});

				homebridgeAccessory.getServiceById(Service.Lightbulb, serviceConfig.subtype).getCharacteristic(Characteristic.Brightness).updateValue(this.brightness);
			}

			if(state.power != null)
            {
				this.power = state.power;

				this.setState(this.power, () => {});

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

			this.power = settings.on;
			this.hue = settings.color.hue;
			this.saturation = settings.color.saturation;
			this.brightness = settings.color.brightness;

			super.setState(this.power, () => {});
			super.setHue(this.hue, () => {});
			super.setSaturation(this.saturation, () => {});
			super.setBrightness(this.brightness, () => {});

			this.logger.debug('Updating Device ' + this.ip + ' ' + this.hue + ' ' + this.saturation + ' ' + this.brightness + ' ' + this.power);

			this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.On).updateValue(this.power);
			this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.Hue).updateValue(this.hue);
			this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.Saturation).updateValue(this.saturation);
			this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.Brightness).updateValue(this.brightness);

			this.startTimer();
		});
	}

	getState(callback)
	{
		super.getState((value) => {

            if(value != null)
            {
				this.power = value;
			}
				
			callback(null, value != null ? value : false);
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
			}
				
			callback(null, value != null ? value : 0);
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
			}
				
			callback(null, value != null ? value : 0);
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
			}
				
			callback(null, value != null ? value : 50);
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