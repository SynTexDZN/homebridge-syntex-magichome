const { ColoredBulbService } = require('homebridge-syntex-dynamic-platform');

const convert = require('color-convert'), emitter = require('../emitter');

let DeviceManager;

module.exports = class LightBulb extends ColoredBulbService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		DeviceManager = manager.DeviceManager;

		var specialConfig = serviceConfig;

		specialConfig.type = 'rgb';

		super(homebridgeAccessory, deviceConfig, specialConfig, manager);

		super.getState((power) => super.getHue((hue) => super.getSaturation((saturation) => super.getBrightness((brightness) => {

			this.tempState = {};

			this.tempState.power = this.power = power || false;
			this.tempState.hue = this.hue = hue || 0;
			this.tempState.saturation = this.saturation = saturation || 100;
			this.tempState.brightness = this.brightness = brightness || 50;

			this.service.getCharacteristic(this.Characteristic.On).updateValue(this.power);
			this.service.getCharacteristic(this.Characteristic.Hue).updateValue(this.hue);
			this.service.getCharacteristic(this.Characteristic.Saturation).updateValue(this.saturation);
			this.service.getCharacteristic(this.Characteristic.Brightness).updateValue(this.brightness);

			this.logger.debug('Get State From Cache', this.tempState);

		}, true))));

		this.ip = serviceConfig.ip;
		this.setup = serviceConfig.type == 'rgb' ? 'RGBW' : serviceConfig.type == 'rgbw' ? 'RGBWW' : 'RGBW';
		//this.purewhite = serviceConfig.purewhite || false;

		this.running = false;

		setInterval(() => {

			if(!this.running && (this.power != this.tempState.power || this.hue != this.tempState.hue || this.saturation != this.tempState.saturation || this.brightness != this.tempState.brightness))
			{
				this.running = true;

				this.logger.debug('Refresh To Last State', this.power != this.tempState.power, this.hue != this.tempState.hue || this.saturation != this.tempState.saturation || this.brightness != this.tempState.brightness);
				
				if(this.power != this.tempState.power)
				{
					this.setPower(this.tempState.power).then(() => {

						this.running = false;
					});
				}
				else if(this.hue != this.tempState.hue || this.saturation != this.tempState.saturation || this.brightness != this.tempState.brightness)
				{
					var converted = convert.hsv.rgb([this.tempState.hue, this.tempState.saturation, this.tempState.brightness]);

					if(converted != null)
					{
						this.setColor(converted[0], converted[1], converted[2]).then(() => {

							this.running = false;
						});
					}
					else
					{
						this.running = false;
					}
				}
				else
				{
					this.running = false;
				}
			}

		}, 1000);

		this.changeHandler = (state) => {

			state.power = state.value;

			this.logger.debug('Change Handler', state);

			this.setToCurrentColor(state, () => {

				if(state.value != null)
				{
					this.service.getCharacteristic(this.Characteristic.On).updateValue(state.value)

					super.setState(state.value, () => {});
				}

				if(state.hue != null)
				{
					this.service.getCharacteristic(this.Characteristic.Hue).updateValue(state.hue)

					super.setHue(state.hue, () => {});
				}

				if(state.saturation != null)
				{
					this.service.getCharacteristic(this.Characteristic.Saturation).updateValue(state.saturation)

					super.setSaturation(state.saturation, () => {});
				}

				if(state.brightness != null)
				{
					this.service.getCharacteristic(this.Characteristic.Brightness).updateValue(state.brightness)

					super.setBrightness(state.brightness, () => {});
				}
			});
		};
	}

	updateState(state)
	{
		this.logger.debug('Update State', state, this.running);
		
		if(!this.running)
		{
			var changed = false;

			if(state.power != null && !isNaN(state.power) && this.power != state.power)
			{
				this.service.getCharacteristic(this.Characteristic.On).updateValue(state.power);

				this.tempState.power = this.power = state.power;

				changed = true;
			}

			if(state.hue != null && !isNaN(state.hue) && this.hue != state.hue)
			{
				this.service.getCharacteristic(this.Characteristic.Hue).updateValue(state.hue);

				this.tempState.hue = this.hue = state.hue;

				changed = true;
			}

			if(state.saturation != null && !isNaN(state.saturation) && this.saturation != state.saturation)
			{
				this.service.getCharacteristic(this.Characteristic.Saturation).updateValue(state.saturation);

				this.tempState.saturation = this.saturation = state.saturation;

				changed = true;
			}

			if(state.brightness != null && !isNaN(state.brightness) && this.brightness != state.brightness)
			{
				this.service.getCharacteristic(this.Characteristic.Brightness).updateValue(state.brightness);

				this.tempState.brightness = this.brightness = state.brightness;

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
			else
			{
				this.logger.log('debug', this.id, this.letters, '%update_state[0]% [' + this.name + '] was not changed! ( ' + this.id + ' )');
			}
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
				DeviceManager.getDevice(this.id, (state) => {

					if(state != null && state.power != null && !isNaN(state.power))
					{
						this.power = state.power;

						super.setState(this.power, () => {});

						this.logger.log('read', this.id, this.letters, '%read_state[0]% [' + this.name + '] %read_state[1]% [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
					}
					
					callback(null, this.power);
				});
			}

		}, true);
	}

	setState(value, callback)
	{
		this.setToCurrentColor({ power : value }, (offline) => {
			
			if(!offline)
			{
				super.setState(value, () => callback());
			}
			else
			{
				callback(new Error('Offline'));
			}
		});
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
				DeviceManager.getDevice(this.id, (state) => {

					if(state != null && state.hue != null && !isNaN(state.hue))
					{
						this.hue = state.hue;
					
						super.setHue(this.hue, () => {});
					}
					
					callback(null, this.hue);
				});
			}
		});
	}

	setHue(value, callback)
	{
		this.setToCurrentColor({ hue : value }, (offline) => {
			
			if(!offline)
			{
				super.setHue(value, () => callback());
			}
			else
			{
				callback(new Error('Offline'));
			}
		});
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
				DeviceManager.getDevice(this.id, (state) => {

					if(state != null && state.saturation != null && !isNaN(state.saturation))
					{
						this.saturation = state.saturation;

						super.setSaturation(this.saturation, () => {});
					}
					
					callback(null, this.saturation);
				});
			}
		});
	}

	setSaturation(value, callback)
	{
		this.setToCurrentColor({ saturation : value }, (offline) => {
			
			if(!offline)
			{
				super.setSaturation(value, () => callback());
			}
			else
			{
				callback(new Error('Offline'));
			}
		});
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
				DeviceManager.getDevice(this.id, (state) => {

					if(state != null && state.brightness != null && !isNaN(state.brightness))
					{
						this.brightness = state.brightness;

						super.setBrightness(this.brightness, () => {});
					}
					
					callback(null, this.brightness);
				});
			}
		});
	}

	setBrightness(value, callback)
	{
		this.setToCurrentColor({ brightness : value }, (offline) => {

			if(!offline)
			{
				super.setBrightness(value, () => callback());
			}
			else
			{
				callback(new Error('Offline'));
			}
		});
	}
	/*
	setToWarmWhite()
	{
		DeviceManager.executeCommand(this.ip, '-w ' + this.brightness);
	}
	*/
	setToCurrentColor(state, callback)
	{
		this.logger.debug('Set To Current Color', state);

		if(state.power != null)
		{
			this.tempState.power = state.power;

			if(this.power != state.power)
			{
				this.changedPower = true;
			}
		}

		if(state.hue != null)
		{
			this.tempState.hue = state.hue;

			if(this.hue != state.hue)
			{
				this.changedColor = true;
			}
		}

		if(state.saturation != null)
		{
			this.tempState.saturation = state.saturation;

			if(this.saturation != state.saturation)
			{
				this.changedColor = true;
			}
		}

		if(state.brightness != null)
		{
			this.tempState.brightness = state.brightness;

			if(this.brightness != state.brightness)
			{
				this.changedColor = true;
			}
		}

		setTimeout(() => {

			if(!this.running)
			{
				this.running = true;

				if(this.changedPower)
				{
					this.setPower(this.tempState.power).then((offline) => {

						this.running = false;

						this.changedPower = false;

						if(callback != null)
						{
							callback(offline);
						}
					});
				}
				else if(this.changedColor)
				{
					var converted = convert.hsv.rgb([this.tempState.hue, this.tempState.saturation, this.tempState.brightness]);

					if(converted != null)
					{
						this.setColor(converted[0], converted[1], converted[2]).then((offline) => {

							this.running = false;
		
							this.changedColor = false;
		
							if(callback != null)
							{
								callback(offline);
							}
						});
					}
					else
					{
						this.running = false;

						this.changedColor = false;
		
						if(callback != null)
						{
							callback(this.offline);
						}
					}
				}
				else
				{
					this.running = false;
					
					if(callback != null)
					{
						callback(this.offline);
					}
				}

				emitter.emit('SynTexMagicHomePresetTurnedOn', this.name, [ this.ip ]);

				this.AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, { value : this.tempState.power, hue : this.tempState.hue, saturation : this.tempState.saturation, brightness : this.tempState.brightness });
			}
			else if(callback != null)
			{
				callback(this.offline);
			}

		}, 10);
		/*
		if(this.saturation === 0 && this.hue === 0 && this.purewhite)
		{
			this.setToWarmWhite();
			return;
		}
		*/
	}

	setPower(power)
	{
		return new Promise((resolve) => {

			DeviceManager.executeCommand(this.ip, power ? '--on' : '--off', (error, output) => {

				this.offline = error;

				if(!error)
				{
					this.power = output.includes('Turning on') ? true : output.includes('Turning off') ? false : power;

					this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
				}

				resolve(error);
			});
		});
	}

	setColor(red, green, blue)
	{
		return new Promise((resolve) => {

			DeviceManager.executeCommand(this.ip, '-x ' + this.setup + ' -c ' + red + ',' + green + ',' + blue, (error, output) => {

				this.offline = error;
	
				if(!error)
				{
					var rgb = null, hsl = null;

					if(output.includes('('))
					{
						rgb = output.split('(')[1];
					}

					if(rgb.includes(')'))
					{
						rgb = rgb.split(')')[0];
					}

					if(rgb.includes(', '))
					{
						rgb = rgb.split(', ');
					}

					if(rgb != null && Array.isArray(rgb) && rgb.length == 3)
					{
						hsl = convert.rgb.hsv([rgb[0], rgb[1], rgb[2]]);
					}

					if(hsl != null)
					{
						this.hue = hsl[0];
						this.saturation = hsl[1];
						this.brightness = hsl[2];
					}
	
					this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
				}

				resolve(error);
			});
		});
	}
}