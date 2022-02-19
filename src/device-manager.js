const cp = require('child_process'), path = require('path'), convert = require('color-convert');

module.exports = class DeviceManager
{
	constructor(logger)
	{
		this.logger = logger;
	}

	getDevice(ip, callback)
	{
		this.executeCommand(ip, '-i', (error, stdout) => {

			var settings = {};

			var colors = stdout.match(/\(.*,.*,.*\)/g);
			var power = stdout.match(/\] ON /g);

			settings.power = (power && power.length > 0);

			if(colors && colors.length > 0)
			{
				var str = colors.toString().substring(0, colors.toString().length - 1);
				str = str.substring(1, str.length);

				const rgbColors = str.split(',').map((item) => { return item.trim() });

				var converted = convert.rgb.hsv(rgbColors);

				settings.hue = converted[0];
				settings.saturation = converted[1];
				settings.brightness = converted[2];
			}

			callback(settings);
		});
	}

	refreshAccessories(accessories)
	{
		this.logger.debug('%device_refresh% ..');

		for(const accessory of accessories)
		{
			if(Array.isArray(accessory[1].services))
			{
				for(const i in accessory[1].services)
				{
					if(accessory[1].services[i].type == 'rgb' || accessory[1].services[i].type == 'rgbw')
					{
						this.getDevice(accessory[1].services[i].ip, (state) => accessory[1].service[parseInt(i) + 1].updateState(state));
					}
				}
			}
			else if(accessory[1].services instanceof Object)
			{
				if(accessory[1].services.type == 'rgb' || accessory[1].services.type == 'rgbw')
				{
					this.getDevice(accessory[1].services.ip, (state) => accessory[1].service[1].updateState(state));
				}
			}
		}
	}

	executeCommand(address, command, callback)
	{
		const exec = cp.exec;
		const cmd = path.join(__dirname, './flux_led.py ' + address + ' ' + command);

		exec(cmd, (err, stdOut) => {
			
			if(callback)
			{
				callback(err != null || (stdOut != null && stdOut.includes('Errno 113')), stdOut);
			}

			this.logger.debug(stdOut);
			
			if(err)
			{
				this.logger.log('error', 'bridge', 'Bridge', '%execution_error% [flux_led.py]', err);
			}
		});
	}
}