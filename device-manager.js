const cp = require('child_process');
const path = require('path');
const convert = require('color-convert');

module.exports = class DeviceManager
{
	constructor(log)
	{
		this.logger = log;
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
				// Remove last char )
				var str = colors.toString().substring(0, colors.toString().length - 1);
				// Remove First Char (
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
		this.logger.debug('Geräte Status aktualisieren ..');

		for(const accessory of accessories)
		{
			this.getDevice(accessory.ip, (state) => accessory.updateState(state));
			/*
			var state = { power : device.data.state };

			try
			{
				if(device.data.state != null)
				{
					state.power = JSON.parse(device.data.state);
				}

				if(device.data.brightness != null)
				{
					state.brightness = JSON.parse(device.data.brightness) / 2.55;
				}
			}
			catch(e)
			{
				logger.err(e);
			}

			for(const accessory of accessories)
			{
				if(accessory[1].id == device.id)
				{
					accessory[1].service[1].updateState(state);
				}
			}
			*/
		}

		resolve(true);
	}

	executeCommand(address, command, callback)
	{
		const exec = cp.exec;
		const cmd = path.join(__dirname, './src/flux_led.py ' + address + ' ' + command);

		this.logger.debug(cmd);
		
		exec(cmd, (err, stdOut) => {
			
			this.logger.debug(stdOut);
			
			if(err)
			{
				this.logger.log('error', 'bridge', 'Bridge', 'Es fehlen Berechtigungen zum Ausführen von [flux_led.py] ' + err);
			}

			if(callback)
			{
				callback(err, stdOut);
			}
		});
	}
}