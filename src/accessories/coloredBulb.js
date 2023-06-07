const { ColoredBulbService } = require('homebridge-syntex-dynamic-platform');

const convert = require('color-convert');

module.exports = class SynTexColoredBulbService extends ColoredBulbService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		var specialConfig = { ...serviceConfig };

		specialConfig.type = 'rgb';

		super(homebridgeAccessory, deviceConfig, specialConfig, manager);

		this.DeviceManager = manager.DeviceManager;
		this.EventManager = manager.platform.EventManager;

		this.ip = serviceConfig.ip;
		this.setup = serviceConfig.type == 'rgbw' ? 'RGBWW' : 'RGBW';
		this.pins = serviceConfig.pins || 'rgb';
		//this.purewhite = serviceConfig.purewhite || false;

		setInterval(() => {

			if(!this.running && (this.value != this.tempState.value || this.hue != this.tempState.hue || this.saturation != this.tempState.saturation || this.brightness != this.tempState.brightness))
			{
				this.setToCurrentColor({ ...this.tempState }, (failed) => {

					if(!failed)
					{
						this.service.getCharacteristic(this.Characteristic.On).updateValue(this.value);
						this.service.getCharacteristic(this.Characteristic.Hue).updateValue(this.hue);
						this.service.getCharacteristic(this.Characteristic.Saturation).updateValue(this.saturation);
						this.service.getCharacteristic(this.Characteristic.Brightness).updateValue(this.brightness);
					}
				});
			}

		}, 1000);

		this.changeHandler = (state) => {

			this.setToCurrentColor(state, (failed) => {

				if(!failed)
				{
					this.service.getCharacteristic(this.Characteristic.On).updateValue(this.value);
					this.service.getCharacteristic(this.Characteristic.Hue).updateValue(this.hue);
					this.service.getCharacteristic(this.Characteristic.Saturation).updateValue(this.saturation);
					this.service.getCharacteristic(this.Characteristic.Brightness).updateValue(this.brightness);
				}
			});
		};
	}

	updateState(state)
	{
		if(!this.running)
		{
			var changed = false;

			if(state.value != null && !isNaN(state.value) && (!super.hasState('value') || this.value != state.value))
			{
				this.tempState.value = state.value;

				super.setState(state.value,
					() => this.service.getCharacteristic(this.Characteristic.On).updateValue(state.value), false);

				changed = true;
			}

			if(state.hue != null && !isNaN(state.hue) && (!super.hasState('hue') || this.hue != state.hue))
			{
				this.tempState.hue = state.hue;

				super.setHue(state.hue,
					() => this.service.getCharacteristic(this.Characteristic.Hue).updateValue(state.hue), false);

				changed = true;
			}

			if(state.saturation != null && !isNaN(state.saturation) && (!super.hasState('saturation') || this.saturation != state.saturation))
			{
				this.tempState.saturation = state.saturation;

				super.setSaturation(state.saturation,
					() => this.service.getCharacteristic(this.Characteristic.Saturation).updateValue(state.saturation), false);

				changed = true;
			}

			if(state.brightness != null && !isNaN(state.brightness) && (!super.hasState('brightness') || this.brightness != state.brightness))
			{
				this.tempState.brightness = state.brightness;

				super.setBrightness(state.brightness,
					() => this.service.getCharacteristic(this.Characteristic.Brightness).updateValue(state.brightness), false);

				changed = true;
			}
			
			if(changed)
			{
				this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [' + this.getStateText() + '] ( ' + this.id + ' )');
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
		super.getState(() => {

			if(!super.hasState('value'))
			{
				this.DeviceManager.getState(this).then((state) => {

					this.updateState(state);
					
					callback(null, this.value);
				});
			}
			else
			{
				callback(null, this.value);
			}

		}, super.hasState('value') || super.hasState('hue') || super.hasState('saturation') || super.hasState('brightness'));
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
				callback(new Error('Failed'));
			}
		});
	}

	getHue(callback)
	{
		super.getHue(() => {

			if(!super.hasState('hue'))
			{
				this.DeviceManager.getState(this).then((state) => {

					this.updateState(state);
					
					callback(null, this.hue);
				});
			}
			else
			{
				callback(null, this.hue);
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
				callback(new Error('Failed'));
			}
		});
	}

	getSaturation(callback)
	{
		super.getSaturation(() => {

			if(!super.hasState('saturation'))
			{
				this.DeviceManager.getState(this).then((state) => {

					this.updateState(state);
					
					callback(null, this.saturation);
				});
			}
			else
			{
				callback(null, this.saturation);
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
				callback(new Error('Failed'));
			}
		});
	}

	getBrightness(callback)
	{
		super.getBrightness(() => {

			if(!super.hasState('brightness'))
			{
				this.DeviceManager.getState(this).then((state) => {

					this.updateState(state);
					
					callback(null, this.brightness);
				});
			}
			else
			{
				callback(null, this.brightness);
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
				callback(new Error('Failed'));
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
		const setPower = (resolve) => {

			this.DeviceManager.executeCommand(this.ip, this.tempState.value ? '--on' : '--off', (offline, output) => {

				var failed = offline || (this.tempState.value && !output.includes('Turning on')) || (!this.tempState.value && !output.includes('Turning off'));

				this.offline = offline;

				if(!failed)
				{
					super.setState(this.tempState.value);
				}

				if(callback != null)
				{
					callback(failed);
				}

				this.setConnectionState(!this.offline,
					() => resolve(), true);

				this.AutomationSystem.LogikEngine.runAutomation(this, { value : this.value, hue : this.hue, saturation : this.saturation, brightness : this.brightness });
			});
		};

		const setColor = (resolve) => {

			var converted = convert.hsv.rgb([this.tempState.hue, this.tempState.saturation, this.tempState.brightness]);

			if(converted != null)
			{
				converted = this.setChannels(converted);
				
				this.DeviceManager.executeCommand(this.ip, '-x ' + this.setup + ' -c ' + converted[0] + ',' + converted[1] + ',' + converted[2], (offline, output) => {

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
								super.setHue(hsl[0]);
								super.setSaturation(hsl[1]);
								super.setBrightness(hsl[2]);

								this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [' + this.getStateText() + '] ( ' + this.id + ' )');
							}
						}

						this.EventManager.setOutputStream('resetSwitch', { sender : this }, [ this.ip ]);
					}

					if(callback != null)
					{
						callback(failed);
					}

					this.setConnectionState(!this.offline,
						() => resolve(), true);

					this.AutomationSystem.LogikEngine.runAutomation(this, { value : this.value, hue : this.hue, saturation : this.saturation, brightness : this.brightness });
				});
			}
			else
			{
				if(callback != null)
				{
					callback(this.offline);
				}

				resolve();
			}
		};

		super.setToCurrentColor(state, (resolve) => {

			setPower(resolve);

		}, (resolve) => {

			setColor(resolve);

		}, (resolve) => {

			if(callback != null)
			{
				callback(this.offline);
			}

			resolve();
		});
		/*
		if(this.saturation === 0 && this.hue === 0 && this.purewhite)
		{
			this.setToWarmWhite();
			return;
		}
		*/
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