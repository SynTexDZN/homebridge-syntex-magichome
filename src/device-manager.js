const cp = require('child_process'), path = require('path'), convert = require('color-convert');

module.exports = class DeviceManager
{
	constructor(logger)
	{
		this.logger = logger;
	}

	getDevice(service, callback)
	{
		this.executeCommand(service.ip, '-i', (offline, stdout) => {

			var state = {};

			var colors = stdout.match(/\(.*,.*,.*\)/g);
			var power = stdout.match(/\] ON /g);

			state.value = (power != null && power.length > 0);

			if(colors && colors.length > 0)
			{
				var str = colors.toString().substring(0, colors.toString().length - 1);
				str = str.substring(1, str.length);

				var rgbColors = str.split(',').map((item) => { return item.trim() });

				rgbColors = service.setChannels(rgbColors);
				
				var converted = convert.rgb.hsv(rgbColors);

				state.hue = converted[0];
				state.saturation = converted[1];
				state.brightness = converted[2];
			}

			state.connection = !stdout.includes('Unable to connect to bulb');

			callback(state);
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
						this.getDevice(accessory[1].service[parseInt(i) + 1], (state) => {
							
							accessory[1].service[parseInt(i) + 1].setConnectionState(state.connection,
								() => accessory[1].service[parseInt(i) + 1].updateState(state), true);
						});
					}
				}
			}
			else if(accessory[1].services instanceof Object)
			{
				if(accessory[1].services.type == 'rgb' || accessory[1].services.type == 'rgbw')
				{
					this.getDevice(accessory[1].service[1], (state) => {
						
						accessory[1].service[1].setConnectionState(state.connection,
							() => accessory[1].service[1].updateState(state), true);
					});
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
				callback(err != null || (stdOut != null && (stdOut.includes('Errno 113') || stdOut.includes('Unable to connect to bulb'))), stdOut);
			}

			this.logger.debug(stdOut);
			
			if(err)
			{
				this.logger.log('error', 'bridge', 'Bridge', '%execution_error% [flux_led.py]', err);
			}
		});
	}
}