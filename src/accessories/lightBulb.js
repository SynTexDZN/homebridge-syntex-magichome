let Characteristic, DeviceManager, AutomationSystem;

const { ColoredBulbService } = require('homebridge-syntex-dynamic-platform');

const convert = require('color-convert');
const emitter = require('../emitter');

module.exports = class LightBulb extends ColoredBulbService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Characteristic = manager.platform.api.hap.Characteristic;
		DeviceManager = manager.DeviceManager;
		AutomationSystem = manager.AutomationSystem;

		var specialConfig = serviceConfig;

		specialConfig.type = 'rgb';

		super(homebridgeAccessory, deviceConfig, specialConfig, manager);

		super.getState((power) => super.getHue((hue) => super.getSaturation((saturation) => super.getBrightness((brightness) => {

			this.power = power || false;
			this.hue = hue || 0;
			this.saturation = saturation || 100;
			this.brightness = brightness || 50;

			this.service.getCharacteristic(Characteristic.On).updateValue(this.power);
			this.service.getCharacteristic(Characteristic.Hue).updateValue(this.hue);
			this.service.getCharacteristic(Characteristic.Saturation).updateValue(this.saturation);
			this.service.getCharacteristic(Characteristic.Brightness).updateValue(this.brightness);

		}, true))));

		this.ip = deviceConfig.ip;
		this.purewhite = deviceConfig.purewhite || false;
		this.setup = serviceConfig.type == 'rgb' ? 'RGBW' : serviceConfig.type == 'rgbw' ? 'RGBWW' : 'RGBW';

		this.running = false;

		this.changeHandler = (state) => {

			state.power = state.value;

			this.setToCurrentColor(state, () => {

				if(state.value != null)
				{
					this.service.getCharacteristic(Characteristic.On).updateValue(state.value)

					super.setState(state.value, () => {});
				}

				if(state.hue != null)
				{
					this.service.getCharacteristic(Characteristic.Hue).updateValue(state.hue)

					super.setHue(state.hue, () => {});
				}

				if(state.saturation != null)
				{
					this.service.getCharacteristic(Characteristic.Saturation).updateValue(state.saturation)

					super.setSaturation(state.saturation, () => {});
				}

				if(state.brightness != null)
				{
					this.service.getCharacteristic(Characteristic.Brightness).updateValue(state.brightness)

					super.setBrightness(state.brightness, () => {});
				}
			});
		};
	}

	updateState(state)
	{
		var changed = false;

		if(state.power != null && this.power != state.power)
		{
			this.service.getCharacteristic(Characteristic.On).updateValue(state.power);

			this.power = state.power;

			changed = true;
		}

		if(state.hue != null && this.hue != state.hue)
		{
			this.service.getCharacteristic(Characteristic.Hue).updateValue(state.hue);

			this.hue = state.hue;

			changed = true;
		}

		if(state.saturation != null && this.saturation != state.saturation)
		{
			this.service.getCharacteristic(Characteristic.Saturation).updateValue(state.saturation);

			this.saturation = state.saturation;

			changed = true;
		}

		if(state.brightness != null && this.brightness != state.brightness)
		{
			this.service.getCharacteristic(Characteristic.Brightness).updateValue(state.brightness);

			this.brightness = state.brightness;

			changed = true;
		}
		
		super.setState(state.power, () => {});
		super.setHue(state.hue, () => {});
		super.setSaturation(state.saturation, () => {});
		super.setBrightness(state.brightness, () => {});

		if(changed)
		{
			this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
		}
	}

	getState(callback)
	{
		super.getState((value) => {

			if(value != null)
			{
				callback(null, value);

				this.power = value;
			}
			else
			{
				DeviceManager.getDevice(this.id).then((state) => {

					if(state != null)
					{
						this.power = state.power;

						super.setState(this.power);

						this.logger.log('read', this.id, this.letters, '%read_state[0]% [' + this.name + '] %read_state[1]% [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
					}
					
					callback(null, this.power);
				});
			}

		}, true);
	}

	setState(value, callback)
	{
		this.setToCurrentColor({ power : value },
			() => super.setState(value,
			() => callback()));
	}

	getHue(callback)
	{
		super.getHue((value) => {

			if(value != null)
			{
				callback(null, value);

				this.hue = value;
			}
			else
			{
				DeviceManager.getDevice(this.id).then((state) => {

					if(state != null)
					{
						this.hue = state.hue;
					
						super.setHue(this.hue);
					}
					
					callback(null, this.hue);
				});
			}
		});
	}

	setHue(value, callback)
	{
		this.setToCurrentColor({ hue : value },
			() => super.setHue(value,
			() => callback()));
	}

	getSaturation(callback)
	{
		super.getSaturation((value) => {

			if(value != null)
			{
				callback(null, value);

				this.saturation = value;
			}
			else
			{
				DeviceManager.getDevice(this.id).then((state) => {

					if(state != null)
					{
						this.saturation = state.saturation;

						super.setSaturation(this.saturation);
					}
					
					callback(null, this.saturation);
				});
			}
		});
	}

	setSaturation(value, callback)
	{
		this.setToCurrentColor({ saturation : value },
			() => super.setSaturation(value,
			() => callback()));
	}

	getBrightness(callback)
	{
		super.getBrightness((value) => {

			if(value != null)
			{
				callback(null, value);

				this.brightness = value;
			}
			else
			{
				DeviceManager.getDevice(this.id).then((state) => {

					if(state != null)
					{
						this.brightness = state.brightness;

						super.setBrightness(this.brightness);
					}
					
					callback(null, this.brightness);
				});
			}
		});
	}

	setBrightness(value, callback)
	{
		this.setToCurrentColor({ brightness : value },
			() => super.setBrightness(value,
			() => callback()));
	}
	/*
	setToWarmWhite()
	{
		DeviceManager.executeCommand(this.ip, '-w ' + this.brightness);
	}
	*/
	setToCurrentColor(state, callback)
	{
		if(state.power != null && this.power != state.power)
		{
			this.power = state.power;

			this.changedPower = true;
		}

		if(state.hue != null && this.hue != state.hue)
		{
			this.hue = state.hue;

			this.changedColor = true;
		}

		if(state.saturation != null && this.saturation != state.saturation)
		{
			this.saturation = state.saturation;

			this.changedColor = true;
		}

		if(state.brightness != null && this.brightness != state.brightness)
		{
			this.brightness = state.brightness;

			this.changedColor = true;
		}

		if(this.changedPower || this.changedColor)
		{
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

										if(callback)
										{
											callback();
										}

										this.running = false;

										this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
									});

								}, 2000);
							}
							else
							{
								if(callback)
								{
									callback();
								}
		
								this.running = false;

								this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
							}

							this.changedPower = false;
							this.changedColor = false;
						});
					}
					else if(this.changedColor)
					{
						//this.logger.debug(this.hue, this.saturation, this.brightness);

						var converted = convert.hsv.rgb([this.hue, this.saturation, this.brightness]);

						DeviceManager.executeCommand(this.ip, '-x ' + this.setup + ' -c ' + converted[0] + ',' + converted[1] + ',' + converted[2], () => {

							if(callback)
							{
								callback();
							}

							this.changedPower = false;
							this.changedColor = false;

							this.running = false;

							this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
						});
					}
					else
					{
						this.running = false;
					}

					emitter.emit('SynTexMagicHomePresetTurnedOn', this.name, [ this.ip ]);

					AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, { value : this.power, hue : this.hue, saturation : this.saturation, brightness : this.brightness });
				}
				else if(callback)
				{
					callback();
				}
	
			}, 10);
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