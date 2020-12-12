let Characteristic, DeviceManager;

const { ColoredBulbService } = require('homebridge-syntex-dynamic-platform');

const convert = require('color-convert');
const emitter = require('../emitter');

module.exports = class LightBulb extends ColoredBulbService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
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
			if(state.power != null)
			{
				this.setState(state.power, 
					() => this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.On).updateValue(state.power));
			}

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
		};
	}

	updateState(state)
	{
		var changed = false;

		if(state.power != null && this.power != state.power)
		{
			this.power = state.power;

			this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.On).updateValue(this.power);

			changed = true;
		}

		if(state.hue != null && this.hue != state.hue)
		{
			this.hue = state.hue;

			this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.Hue).updateValue(this.hue);

			changed = true;
		}

		if(state.saturation != null && this.saturation != state.saturation)
		{
			this.saturation = state.saturation;

			this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.Saturation).updateValue(this.saturation);

			changed = true;
		}

		if(state.brightness != null && this.brightness != state.brightness)
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
		this.setToCurrentColor(value, this.hue, this.saturation, this.brightness,
			() => super.setState(value,
			() => callback()));
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
		this.setToCurrentColor(this.power, value, this.saturation, this.brightness,
			() => super.setHue(value,
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
		this.setToCurrentColor(this.power, this.hue, value, this.brightness,
			() => super.setSaturation(value,
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
		this.setToCurrentColor(this.power, this.hue, this.saturation, value,
			() => super.setBrightness(value,
			() => callback()));
	}

	setToWarmWhite()
	{
		DeviceManager.executeCommand(this.ip, '-w ' + this.brightness);
	}

	setToCurrentColor(power, hue, saturation, brightness, callback)
	{
		var changed = false;

		if(this.power != power)
		{
			this.power = power;

			this.changedPower = true;
		}

		if(this.hue != hue)
		{
			this.hue = hue;

			this.changedColor = true;
		}

		if(this.saturation != saturation)
		{
			this.saturation = saturation;

			this.changedColor = true;
		}

		if(this.brightness != brightness)
		{
			this.brightness = brightness;

			this.changedColor = true;
		}

		if(this.changedPower || this.changedColor)
		{
			emitter.emit('SynTexMagicHomePresetTurnedOn', this.name, [ this.ip ]);

			setTimeout(() => {

				if(!this.running)
				{
					this.running = true;

					if(this.changedPower)
					{
						DeviceManager.executeCommand(this.ip, this.power ? '--on' : '--off', () => {

							if(this.changedColor)
							{
								setTimeout(() => {

									var converted = convert.hsv.rgb([this.hue, this.saturation, this.brightness]);

									DeviceManager.executeCommand(this.ip, '-x ' + this.setup + ' -c ' + converted[0] + ',' + converted[1] + ',' + converted[2], () => {

										this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
				
										if(callback)
										{
											callback();
										}

										this.changedPower = false;
										this.changedColor = false;
				
										this.running = false;
									});

								}, 2000);
							}
							else
							{
								this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
			
								if(callback)
								{
									callback();
								}
		
								this.changedPower = false;

								this.running = false;
							}
						});
					}
					else if(this.changedColor)
					{
						var converted = convert.hsv.rgb([this.hue, this.saturation, this.brightness]);

						DeviceManager.executeCommand(this.ip, '-x ' + this.setup + ' -c ' + converted[0] + ',' + converted[1] + ',' + converted[2], () => {

							this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
	
							if(callback)
							{
								callback();
							}

							this.changedColor = false;
	
							this.running = false;
						});
					}
				}
				else if(callback)
				{
					callback();
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