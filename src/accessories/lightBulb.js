const convert = require('color-convert');
const Accessory = require('./base');

module.exports = class LightBulb extends Accessory
{
	constructor(config, log, homebridge, manager)
	{
		super(config, log, homebridge, manager);

		console.log(1, this.mac);

		this.name = config.name || 'LED Controller';
		this.ip = config.ip;
		this.color = { H: 0, S: 0, L: 100 };
		this.purewhite = config.purewhite || false;
		this.timeout = config.timeout != null ? config.timeout : 60000;

		this.letters = '30';

		this.DeviceManager.getDevice(this.mac, this.letters).then(function(state) {

			console.log(2, this.mac);
			
			if(state == null)
			{
				this.logger.log('error', this.mac, this.letters, '[' + this.name + '] wurde nicht in der Storage gefunden! ( ' + this.mac + ' )');
			}
			else if(state != null)
			{
				this.logger.log('read', this.mac, this.letters, 'HomeKit Status für [' + this.name + '] ist [' + state + '] ( ' + this.mac + ' )');

				this.isOn = state.split(':')[0];
				this.color = {
					H : state.split(':')[1],
					S : state.split(':')[2],
					L : state.split(':')[3]
				};

				this.service[0].getCharacteristic(this.homebridge.Characteristic.On).updateValue(this.isOn);
				this.service[0].getCharacteristic(this.homebridge.Characteristic.Hue).updateValue(this.color.H);
				this.service[0].getCharacteristic(this.homebridge.Characteristic.Saturation).updateValue(this.color.S);
				this.service[0].getCharacteristic(this.homebridge.Characteristic.Brightness).updateValue(this.color.L);
			}

		}.bind(this));
		
		setTimeout(() => {

			this.updateState();

		}, 3000);

		this.changeHandler = (function(state)
		{
			var temp = this.isOn;

			if(state.includes(':'))
			{
				var power = state.split(':')[0];
				var hue = state.split(':')[1];
				var saturation = state.split(':')[2];
				var brightness = state.split(':')[3];
				
				this.color = { H: hue, S: saturation, L: brightness };

				this.setPowerState(power == 'true' ? true : false, () => setTimeout(() => this.setToCurrentColor(), temp ? 0 : 1000));
			}
			else
			{
				this.setPowerState(state == 'true' ? true : false, () => {});
			}
			
		}.bind(this));
	}

	getAccessoryServices()
	{
		var lightbulbService = new this.homebridge.Service.Lightbulb(this.name);

		lightbulbService.getCharacteristic(this.homebridge.Characteristic.On)
			.on('get', this.getPowerState.bind(this))
			.on('set', this.setPowerState.bind(this));

		lightbulbService.addCharacteristic(new this.homebridge.Characteristic.Hue())
			.on('get', this.getHue.bind(this))
			.on('set', this.setHue.bind(this));

		lightbulbService.addCharacteristic(new this.homebridge.Characteristic.Saturation())
			.on('get', this.getSaturation.bind(this))
			.on('set', this.setSaturation.bind(this));

		lightbulbService.addCharacteristic(new this.homebridge.Characteristic.Brightness())
			.on('get', this.getBrightness.bind(this))
			.on('set', this.setBrightness.bind(this));

		return [lightbulbService];
	}

	sendCommand(command, callback)
	{
		this.executeCommand(this.ip, command, callback);
	}

	getModelName()
	{
		return 'Magic Home Light Bulb';
	}

	logMessage(...args)
	{
		if(this.config.debug)
		{
			this.logger.debug(args);
		}
	}

	startTimer()
	{
		if(this.timeout === 0) return;

		setTimeout(() => {

			this.updateState();

		}, this.timeout);
	}

	updateState()
	{
		const self = this;

		this.logMessage('Polling Light', this.ip);

		self.getState((settings) => {

			self.isOn = settings.on;
			self.color = settings.color;

			self.logMessage('Updating Device', self.ip, self.color, self.isOn);

			self.service[0].getCharacteristic(this.homebridge.Characteristic.On).updateValue(self.isOn);
			self.service[0].getCharacteristic(this.homebridge.Characteristic.Hue).updateValue(self.color.H);
			self.service[0].getCharacteristic(this.homebridge.Characteristic.Saturation).updateValue(self.color.S);
			self.service[0].getCharacteristic(this.homebridge.Characteristic.Brightness).updateValue(self.color.L);

			this.DeviceManager.setDevice(self.mac, self.letters, self.isOn + ':' + self.color.H + ':' + self.color.S + ':' + self.color.L);

			this.startTimer();
		});
	}

	getState(callback)
	{
		this.sendCommand('-i', (error, stdout) => {

			var settings = {
				on: false,
				color: { H: 255, S: 100, L: 50 }
			};

			var colors = stdout.match(/\(.*,.*,.*\)/g);
			var isOn = stdout.match(/\] ON /g);

			if(isOn && isOn.length > 0)
			{
				settings.on = true;
			}

			if(colors && colors.length > 0)
			{
				// Remove last char )
				var str = colors.toString().substring(0, colors.toString().length - 1);
				// Remove First Char (
				str = str.substring(1, str.length);

				const rgbColors = str.split(',').map((item) => {

					return item.trim()
				});

				var converted = convert.rgb.hsv(rgbColors);

				settings.color = {
					H: converted[0],
					S: converted[1],
					L: converted[2]
				};
			}

			callback(settings);
		})
	}

	getPowerState(callback)
	{
		this.DeviceManager.getDevice(this.mac, this.letters).then(function(state) {

			callback(null, state != null ? (state.split(':')[0] || 0) : 0);
	
		}.bind(this)).catch(function(e) {
	
			this.logger.err(e);
		});
	}

	setPowerState(value, callback)
	{
		const self = this;

		this.sendCommand(value ? '--on' : '--off', () => {

			self.isOn = value;

			this.logger.log('update', self.mac, self.letters, 'HomeKit Status für [' + self.name + '] geändert zu [' + self.isOn + ':' + self.color.H + ':' + self.color.S + ':' + self.color.L + '] ( ' + self.mac + ' )');

			this.DeviceManager.setDevice(self.mac, self.letters, self.isOn + ':' + self.color.H + ':' + self.color.S + ':' + self.color.L);

			callback();
		});
	}

	getHue(callback)
	{
		this.DeviceManager.getDevice(this.mac, this.letters).then(function(state) {

			callback(null, state != null ? (state.split(':')[1] || 0) : 0);
	
		}.bind(this)).catch(function(e) {
	
			this.logger.err(e);
		});
	}

	setHue(value, callback)
	{
		this.color.H = value;

		if(!this.isOn)
		{
			this.setPowerState(true, () => setTimeout(() => this.setToCurrentColor(), 1000));
		}
		else
		{
			this.setToCurrentColor();
		}

		callback();
	}

	getBrightness(callback)
	{
		this.DeviceManager.getDevice(this.mac, this.letters).then(function(state) {

			callback(null, state != null ? (state.split(':')[2] || 0) : 0);
	
		}.bind(this)).catch(function(e) {
	
			this.logger.err(e);
		});
	}

	setBrightness(value, callback)
	{
		this.color.L = value;
		
		if(!this.isOn)
		{
			this.setPowerState(true, () => setTimeout(() => this.setToCurrentColor(), 1000));
		}
		else
		{
			this.setToCurrentColor();
		}

		callback();
	}

	getSaturation(callback)
	{
		this.DeviceManager.getDevice(this.mac, this.letters).then(function(state) {

			callback(null, state != null ? (state.split(':')[3] || 0) : 0);
	
		}.bind(this)).catch(function(e) {
	
			this.logger.err(e);
		});
	}

	setSaturation(value, callback)
	{
		this.color.S = value;
		
		if(!this.isOn)
		{
			this.setPowerState(true, () => setTimeout(() => this.setToCurrentColor(), 1000));
		}
		else
		{
			this.setToCurrentColor();
		}

		callback();
	}

	setToWarmWhite()
	{
		this.sendCommand('-w ' + this.color.L);
	}

	setToCurrentColor()
	{
		var color = this.color;

		if(color.S === 0 && color.H === 0 && this.purewhite)
		{
			this.setToWarmWhite();
			return;
		}

		var converted = convert.hsv.rgb([color.H, color.S, color.L]);
		
		this.logger.log('update', this.mac, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [' + this.isOn + ':' + this.color.H + ':' + this.color.S + ':' + this.color.L + '] ( ' + this.mac + ' )');

		var setup = 'RGBW';

		if(this.services == 'rgb')
		{
			setup = 'RGBW';
		}
		else if(this.services == 'rgbw')
		{
			setup = 'RGBWW';
		}

		var base = '-x ' + setup + ' -c ';

		this.sendCommand(base + converted[0] + ',' + converted[1] + ',' + converted[2]);
		this.DeviceManager.setDevice(this.mac, this.letters, this.isOn + ':' + this.color.H + ':' + this.color.S + ':' + this.color.L);
	}
}