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

		var specialConfig = serviceConfig;

		specialConfig.type = 'rgb';

		super(homebridgeAccessory, deviceConfig, specialConfig, manager);

		this.ip = deviceConfig.ip;
		this.purewhite = deviceConfig.purewhite || false;
		this.setup = serviceConfig.type == 'rgb' ? 'RGBW' : serviceConfig.type == 'rgbw' ? 'RGBWW' : 'RGBW';

		this.running = false;

		this.changeHandler = (state) =>
		{
			if(state.hue != null)
			{
				this.setHue(state.hue,
					() => this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.Hue).updateValue(state.hue));
			}

			if(state.saturation != null)
			{
				this.setSaturation(state.saturation, 
					() => this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.Saturation).updateValue(state.saturation));
			}

			if(state.brightness != null)
			{
				this.setBrightness(state.brightness, 
					() => this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.Brightness).updateValue(state.brightness));
			}

			if(state.power != null)
			{
				this.setState(state.power, 
					() => this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.On).updateValue(state.power));
			}
		};
	}

	updateState(state)
	{
		var changed = false;

		if(this.power != state.power)
		{
			this.power = state.power;

			this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.On).updateValue(this.power);

			changed = true;
		}

		if(this.hue != state.hue)
		{
			this.hue = state.hue;

			this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.Hue).updateValue(this.hue);

			changed = true;
		}

		if(this.saturation != state.saturation)
		{
			this.saturation = state.saturation;

			this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.Saturation).updateValue(this.saturation);

			changed = true;
		}

		if(this.brightness != state.brightness)
		{
			this.brightness = state.brightness;

			this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.Brightness).updateValue(this.brightness);

			changed = true;
		}
		
		super.setState(state.power, () => {});
		super.setHue(state.hue, () => {});
		super.setSaturation(state.saturation, () => {});
		super.setBrightness(state.brightness, () => {});

		if(changed)
		{
			this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
		}
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
		DeviceManager.executeCommand(this.ip, value ? '--on' : '--off',
			() => super.setState(value,
			() => {

				this.power = value;

				this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
			
				callback();
			}));
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
		this.setToCurrentColor(value, this.saturation, this.brightness,
			() => super.setSaturation(this.saturation,
			() => callback()));
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
		this.setToCurrentColor(this.hue, value, this.brightness,
			() => super.setSaturation(this.saturation,
			() => callback()));
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
		this.setToCurrentColor(this.hue, this.saturation, value,
			() => super.setBrightness(this.brightness,
			() => callback()));
	}

	setToWarmWhite()
	{
		DeviceManager.executeCommand(this.ip, '-w ' + this.brightness);
	}

	setToCurrentColor(hue, saturation, brightness, callback)
	{
		var changed = false;

		if(this.hue != hue)
		{
			this.hue = hue;

			changed = true;
		}

		if(this.saturation != saturation)
		{
			this.saturation = saturation;

			changed = true;
		}

		if(this.brightness != brightness)
		{
			this.brightness = brightness;

			changed = true;
		}

		if(changed)
		{
			emitter.emit('SynTexMagicHomePresetTurnedOn', this.name, [ this.ip ]);

			setTimeout(async () => {

				if(!this.running)
				{
					this.running = true;

					if(!this.power)
					{
						this.power = true;

						await this.setState(this.power, () => {});

						await new Promise((resolve) => setTimeout(() => resolve(), 1000));
					}
					
					var converted = convert.hsv.rgb([hue, saturation, brightness]);
	
					DeviceManager.executeCommand(this.ip, '-x ' + this.setup + ' -c ' + converted[0] + ',' + converted[1] + ',' + converted[2], () => {

						this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');

						this.running = false;

						if(callback)
						{
							callback();
						}
					});
				}
	
			}, 100);
		}
		else if(callback)
		{
			callback();
		}
		/*
		if(this.saturation === 0 && this.hue === 0 && this.purewhite)
		{
			this.setToWarmWhite();
			return;
		}
		*/
	}
}