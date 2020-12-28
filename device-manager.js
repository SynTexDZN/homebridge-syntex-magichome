const cp = require('child_process');
const path = require('path');
const convert = require('color-convert');

module.exports = class DeviceManager
{
	constructor(logger, LanguageSwitcher)
	{
		this.logger = logger;
		this.LanguageSwitcher = LanguageSwitcher;
	}

	getDevice(ip, callback)
	{
		this.executeCommand(ip, '-i', (error, stdout) => {

			var settings = {
				power: false,
				hue: 0,
				saturation: 100,
				brightness: 50
			};

			var colors = stdout.match(/\(.*,.*,.*\)/g);
			var power = stdout.match(/\] ON /g);

			if(power && power.length > 0)
			{
				settings.power = true;
			}

			if(colors && colors.length > 0)
			{
				var str = colors.toString().substring(0, colors.toString().length - 1);
				str = str.substring(1, str.length);

				const rgbColors = str.split(',').map((item) => {

					return item.trim()
				});

				var converted = convert.rgb.hsv(rgbColors);

				settings.hue = converted[0];
				settings.saturation = converted[1];
				settings.brightness = converted[2];
			}

			callback(settings);
		})
	}

	refreshAccessories(accessories)
	{
		this.logger.debug(this.LanguageSwitcher.language['device_refresh'] + ' ..');

		for(const accessory of accessories)
		{
			if(accessory[1].services == 'rgb' || accessory[1].services == 'rgbw')
			{
				this.getDevice(accessory[1].service[1].ip, (state) => accessory[1].service[1].updateState(state));
			}
		}
	}

	executeCommand(address, command, callback)
	{
		const exec = cp.exec;
		const cmd = path.join(__dirname, './src/flux_led.py ' + address + ' ' + command);

		exec(cmd, (err, stdOut) => {
			
			this.logger.debug(stdOut);
			
			if(err)
			{
				this.logger.log('error', 'bridge', 'Bridge', this.LanguageSwitcher.language['execution_error'] + ' [flux_led.py] ' + err);
			}

			if(callback)
			{
				callback(err, stdOut);
			}
		});
	}
}