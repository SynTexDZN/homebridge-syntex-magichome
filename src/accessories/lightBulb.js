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

			this.tempState = {};

			this.tempState.power = this.power = power || false;
			this.tempState.hue = this.hue = hue || 0;
			this.tempState.saturation = this.saturation = saturation || 100;
			this.tempState.brightness = this.brightness = brightness || 50;

			this.service.getCharacteristic(Characteristic.On).updateValue(this.power);
			this.service.getCharacteristic(Characteristic.Hue).updateValue(this.hue);
			this.service.getCharacteristic(Characteristic.Saturation).updateValue(this.saturation);
			this.service.getCharacteristic(Characteristic.Brightness).updateValue(this.brightness);

		}, true))));

		setInterval(() => {

			if(this.lastState != null && !this.running)
			{
				var converted = convert.hsv.rgb([this.lastState.hue, this.lastState.saturation, this.lastState.brightness]);

				this.lastState = null;

				if(converted != null)
				{
					this.running = true;

					DeviceManager.executeCommand(this.ip, '-x ' + this.setup + ' -c ' + converted[0] + ',' + converted[1] + ',' + converted[2], (errorColor, outputColor) => {

						this.offline = errorColor;

						this.running = false;

						if(!this.offline)
						{
							try
							{
								var rgb = outputColor.split('(')[1].split(')')[0].split(', '), hsl = convert.rgb.hsv([rgb[0], rgb[1], rgb[2]]);

								this.tempState.hue = hsl[0];
								this.tempState.saturation = hsl[1];
								this.tempState.brightness = hsl[2];
							}
							catch(e)
							{
								// Nothing
							}

							for(const i in this.tempState)
							{
								this[i] = this.tempState[i];
							}

							this.logger.log('warn', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
						}
					});
				}
			}

		}, 1000);

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

		if(state.power != null && !isNaN(state.power) && this.power != state.power)
		{
			this.service.getCharacteristic(Characteristic.On).updateValue(state.power);

			this.tempState.power = this.power = state.power;

			changed = true;
		}

		if(state.hue != null && !isNaN(state.hue) && this.hue != state.hue)
		{
			this.service.getCharacteristic(Characteristic.Hue).updateValue(state.hue);

			this.tempState.hue = this.hue = state.hue;

			changed = true;
		}

		if(state.saturation != null && !isNaN(state.saturation) && this.saturation != state.saturation)
		{
			this.service.getCharacteristic(Characteristic.Saturation).updateValue(state.saturation);

			this.tempState.saturation = this.saturation = state.saturation;

			changed = true;
		}

		if(state.brightness != null && !isNaN(state.brightness) && this.brightness != state.brightness)
		{
			this.service.getCharacteristic(Characteristic.Brightness).updateValue(state.brightness);

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
		this.lastState = null;

		if(state.power != null && this.power != state.power)
		{
			this.tempState.power = state.power;

			this.changedPower = true;
		}

		if(state.hue != null && this.hue != state.hue)
		{
			this.tempState.hue = state.hue;

			this.changedColor = true;
		}

		if(state.saturation != null && this.saturation != state.saturation)
		{
			this.tempState.saturation = state.saturation;

			this.changedColor = true;
		}

		if(state.brightness != null && this.brightness != state.brightness)
		{
			this.tempState.brightness = state.brightness;

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
						DeviceManager.executeCommand(this.ip, this.tempState.power ? '--on' : '--off', (errorPower, outputPower) => {

							if(this.changedColor)
							{
								setTimeout(() => {

									var converted = convert.hsv.rgb([this.tempState.hue, this.tempState.saturation, this.tempState.brightness]);

									DeviceManager.executeCommand(this.ip, '-x ' + this.setup + ' -c ' + converted[0] + ',' + converted[1] + ',' + converted[2], (errorColor, outputColor) => {

										this.offline = errorPower || errorColor;

										if(callback)
										{
											callback(this.offline);
										}

										this.running = false;

										if(!this.offline)
										{
											try
											{
												var rgb = outputColor.split('(')[1].split(')')[0].split(', '), hsl = convert.rgb.hsv([rgb[0], rgb[1], rgb[2]]);

												this.tempState.hue = hsl[0];
												this.tempState.saturation = hsl[1];
												this.tempState.brightness = hsl[2];
											}
											catch(e)
											{
												// Nothing
											}
											
											for(const i in this.tempState)
											{
												this[i] = this.tempState[i];
											}
											
											this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
										}
									});

								}, 2000);
							}
							else
							{
								this.offline = errorPower;

								if(callback)
								{
									callback(this.offline);
								}
		
								this.running = false;

								if(!this.offline)
								{
									this.tempState.power = outputPower.includes('Turning on') ? true : outputPower.includes('Turning off') ? false : this.tempState.power;

									for(const i in this.tempState)
									{
										this[i] = this.tempState[i];
									}
									
									this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
								}
							}

							this.changedPower = false;
							this.changedColor = false;
						});
					}
					else if(this.changedColor)
					{
						var converted = convert.hsv.rgb([this.tempState.hue, this.tempState.saturation, this.tempState.brightness]);

						DeviceManager.executeCommand(this.ip, '-x ' + this.setup + ' -c ' + converted[0] + ',' + converted[1] + ',' + converted[2], (errorColor, outputColor) => {

							this.offline = errorColor;

							if(callback)
							{
								callback(this.offline);
							}

							this.changedPower = false;
							this.changedColor = false;

							this.running = false;

							if(!this.offline)
							{
								try
								{
									var rgb = outputColor.split('(')[1].split(')')[0].split(', '), hsl = convert.rgb.hsv([rgb[0], rgb[1], rgb[2]]);

									this.tempState.hue = hsl[0];
									this.tempState.saturation = hsl[1];
									this.tempState.brightness = hsl[2];
								}
								catch(e)
								{
									// Nothing
								}

								for(const i in this.tempState)
								{
									this[i] = this.tempState[i];
								}

								this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
							}
						});
					}
					else
					{
						this.running = false;
					}

					emitter.emit('SynTexMagicHomePresetTurnedOn', this.name, [ this.ip ]);

					AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, { value : this.tempState.power, hue : this.tempState.hue, saturation : this.tempState.saturation, brightness : this.tempState.brightness });
				}
				else if(callback)
				{
					this.lastState = state;

					callback(this.offline);
				}
	
			}, 10);
		}
		else if(callback)
		{
			callback(this.offline);
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