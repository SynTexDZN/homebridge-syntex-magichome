const { ColoredBulbService } = require('homebridge-syntex-dynamic-platform');

const convert = require('color-convert');

module.exports = class LightBulb extends ColoredBulbService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		var specialConfig = { ...serviceConfig };

		specialConfig.type = 'rgb';

		super(homebridgeAccessory, deviceConfig, specialConfig, manager);

		this.tempState = {
			value : this.value,
			hue : this.hue,
			saturation : this.saturation,
			brightness : this.brightness
		};

		this.DeviceManager = manager.DeviceManager;
		this.EventManager = manager.platform.EventManager;

		this.ip = serviceConfig.ip;
		this.setup = serviceConfig.type == 'rgbw' ? 'RGBWW' : 'RGBW';
		this.pins = serviceConfig.pins || 'rgb';
		//this.purewhite = serviceConfig.purewhite || false;

		this.running = false;

		setInterval(() => {

			if(!this.running && (this.value != this.tempState.value || this.hue != this.tempState.hue || this.saturation != this.tempState.saturation || this.brightness != this.tempState.brightness))
			{
				this.running = true;

				if(this.value != this.tempState.value)
				{
					this.setPower(this.tempState.value).then((failed) => {

						if(!failed)
						{
							this.service.getCharacteristic(this.Characteristic.On).updateValue(this.value);
						}

						this.running = false;
					});
				}
				else if(this.hue != this.tempState.hue || this.saturation != this.tempState.saturation || this.brightness != this.tempState.brightness)
				{
					var converted = convert.hsv.rgb([this.tempState.hue, this.tempState.saturation, this.tempState.brightness]);

					if(converted != null)
					{
						converted = this.setChannels(converted);

						this.setColor(converted[0], converted[1], converted[2]).then((failed) => {

							if(!failed)
							{
								this.service.getCharacteristic(this.Characteristic.Hue).updateValue(this.hue);
								this.service.getCharacteristic(this.Characteristic.Saturation).updateValue(this.saturation);
								this.service.getCharacteristic(this.Characteristic.Brightness).updateValue(this.brightness);
							}

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

			this.setToCurrentColor(state, (failed) => {

				if(!failed)
				{
					if(state.value != null)
					{
						this.service.getCharacteristic(this.Characteristic.On).updateValue(state.value);
					}

					if(state.hue != null)
					{
						this.service.getCharacteristic(this.Characteristic.Hue).updateValue(state.hue);
					}

					if(state.saturation != null)
					{
						this.service.getCharacteristic(this.Characteristic.Saturation).updateValue(state.saturation);
					}

					if(state.brightness != null)
					{
						this.service.getCharacteristic(this.Characteristic.Brightness).updateValue(state.brightness);
					}
				}
			});
		};
	}

	updateState(state)
	{
		if(!this.running)
		{
			var changed = false;

			if(state.value != null && !isNaN(state.value))
			{
				if(!super.hasState('value') || this.value != state.value)
				{
					changed = true;
				}

				this.value = this.tempState.value = state.value;

				super.setState(state.value,
					() => this.service.getCharacteristic(this.Characteristic.On).updateValue(state.value));
			}

			if(state.hue != null && !isNaN(state.hue))
			{
				if(!super.hasState('hue') || this.hue != state.hue)
				{
					changed = true;
				}

				this.hue = this.tempState.hue = state.hue;

				super.setHue(state.hue,
					() => this.service.getCharacteristic(this.Characteristic.Hue).updateValue(state.hue));
			}

			if(state.saturation != null && !isNaN(state.saturation))
			{
				if(!super.hasState('saturation') || this.saturation != state.saturation)
				{
					changed = true;
				}

				this.saturation = this.tempState.saturation = state.saturation;

				super.setSaturation(state.saturation,
					() => this.service.getCharacteristic(this.Characteristic.Saturation).updateValue(state.saturation));
			}

			if(state.brightness != null && !isNaN(state.brightness))
			{
				if(!super.hasState('brightness') || this.brightness != state.brightness)
				{
					changed = true;
				}

				this.brightness = this.tempState.brightness = state.brightness;

				super.setBrightness(state.brightness,
					() => this.service.getCharacteristic(this.Characteristic.Brightness).updateValue(state.brightness));
			}
			
			if(changed)
			{
				this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [value: ' + this.value + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
			}
			else
			{
				this.logger.log('debug', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[2]%! ( ' + this.id + ' )');
			}

			this.AutomationSystem.LogikEngine.runAutomation(this, state);
		}
	}

	getState(callback)
	{
		super.getState((value) => {

			if(super.hasState('value'))
			{
				this.value = value;

				this.logger.log('read', this.id, this.letters, '%read_state[0]% [' + this.name + '] %read_state[1]% [value: ' + value + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');

				callback(null, value);
			}
			else
			{
				this.DeviceManager.getDevice(this, (state) => {

					if(state.value != null && !isNaN(state.value))
					{
						this.value = state.value;

						super.setState(state.value,
							() => this.logger.log('read', this.id, this.letters, '%read_state[0]% [' + this.name + '] %read_state[1]% [value: ' + state.value + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )'));
					}
					
					callback(null, this.value);
				});
			}
		});
	}

	setState(value, callback)
	{
		this.setToCurrentColor({ value }, (failed) => {
			
			if(!failed)
			{
				callback();
			}
			else
			{
				callback(new Error('Offline'));
			}
		});
	}

	getHue(callback)
	{
		super.getHue((hue) => {

			if(super.hasState('hue'))
			{
				this.hue = hue;

				callback(null, hue);
			}
			else
			{
				this.DeviceManager.getDevice(this, (state) => {

					if(state.hue != null && !isNaN(state.hue))
					{
						this.hue = state.hue;
					
						super.setHue(state.hue, () => {});
					}
					
					callback(null, this.hue);
				});
			}
		});
	}

	setHue(hue, callback)
	{
		this.setToCurrentColor({ hue }, (failed) => {
			
			if(!failed)
			{
				callback();
			}
			else
			{
				callback(new Error('Offline'));
			}
		});
	}

	getSaturation(callback)
	{
		super.getSaturation((saturation) => {

			if(super.hasState('saturation'))
			{
				this.saturation = saturation;

				callback(null, saturation);
			}
			else
			{
				this.DeviceManager.getDevice(this, (state) => {

					if(state.saturation != null && !isNaN(state.saturation))
					{
						this.saturation = state.saturation;

						super.setSaturation(state.saturation, () => {});
					}
					
					callback(null, this.saturation);
				});
			}
		});
	}

	setSaturation(saturation, callback)
	{
		this.setToCurrentColor({ saturation }, (failed) => {
			
			if(!failed)
			{
				callback();
			}
			else
			{
				callback(new Error('Offline'));
			}
		});
	}

	getBrightness(callback)
	{
		super.getBrightness((brightness) => {

			if(super.hasState('brightness'))
			{
				this.brightness = brightness;

				callback(null, brightness);
			}
			else
			{
				this.DeviceManager.getDevice(this, (state) => {

					if(state.brightness != null && !isNaN(state.brightness))
					{
						this.brightness = state.brightness;

						super.setBrightness(state.brightness, () => {});
					}
					
					callback(null, this.brightness);
				});
			}
		});
	}

	setBrightness(brightness, callback)
	{
		this.setToCurrentColor({ brightness }, (failed) => {

			if(!failed)
			{
				callback();
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
		if(state.value != null)
		{
			this.tempState.value = state.value;

			if(this.value != state.value)
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
					this.setPower(this.tempState.value).then((failed) => {

						this.running = false;

						this.changedPower = false;

						if(callback != null)
						{
							callback(failed);
						}
					});
				}
				else if(this.changedColor)
				{
					var converted = convert.hsv.rgb([this.tempState.hue, this.tempState.saturation, this.tempState.brightness]);

					if(converted != null)
					{
						converted = this.setChannels(converted);
						
						this.setColor(converted[0], converted[1], converted[2]).then((failed) => {

							this.running = false;
		
							this.changedColor = false;
		
							if(callback != null)
							{
								callback(failed);
							}

							this.EventManager.setOutputStream('resetSwitch', { sender : this }, [ this.ip ]);
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

	setPower(value)
	{
		return new Promise((resolve) => {

			this.DeviceManager.executeCommand(this.ip, value ? '--on' : '--off', (offline, output) => {

				var failed = offline || (value && !output.includes('Turning on')) || (!value && !output.includes('Turning off'));

				this.offline = offline;

				if(!failed)
				{
					this.value = value;

					super.setState(this.value, () => {}, true);

					this.AutomationSystem.LogikEngine.runAutomation(this, { value : this.value, hue : this.hue, saturation : this.saturation, brightness : this.brightness });
				}

				this.setConnectionState(!this.offline,
					() => resolve(failed), true);
			});
		});
	}

	setColor(red, green, blue)
	{
		return new Promise((resolve) => {

			this.DeviceManager.executeCommand(this.ip, '-x ' + this.setup + ' -c ' + red + ',' + green + ',' + blue, (offline, output) => {

				var failed = offline || !output.includes('Setting color');

				this.offline = offline;

				if(!failed)
				{
					var color = output.match(/\[\(.*,.*,.*\)\]/g);

					if(Array.isArray(color) && color.length > 0)
					{
						var rgb = this.setChannels(color[0].slice(2).slice(0, -2).split(',').map((item) => item.trim())),
							hsl = convert.rgb.hsv([rgb[0], rgb[1], rgb[2]]);

						if(hsl != null)
						{
							this.hue = hsl[0];
							this.saturation = hsl[1];
							this.brightness = hsl[2];
	
							super.setHue(this.hue, () => {});
							super.setSaturation(this.saturation, () => {});
							super.setBrightness(this.brightness, () => {});
						}
					}

					this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [value: ' + this.value + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');

					this.AutomationSystem.LogikEngine.runAutomation(this, { value : this.value, hue : this.hue, saturation : this.saturation, brightness : this.brightness });
				}

				this.setConnectionState(!this.offline,
					() => resolve(failed), true);
			});
		});
	}

	setChannels(color)
	{
		var converted = [ ...color ];

		for(const x in this.pins)
		{
			if(this.pins[x] == 'r')
			{
				converted[x] = color[0];
			}
			else if(this.pins[x] == 'g')
			{
				converted[x] = color[1];
			}
			else if(this.pins[x] == 'b')
			{
				converted[x] = color[2];
			}
		}
					
		return converted;
	}
}