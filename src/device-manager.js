const cp = require('child_process'), path = require('path'), convert = require('color-convert');

module.exports = class DeviceManager
{
	constructor(logger)
	{
		this.logger = logger;
	}

	getDevice(service, callback)
	{
		this.executeCommand(service.ip, '-i', (offline, output) => {

			var state = {};

			if(!offline)
			{
				var power = output.match(/\] ON /g),
					colors = output.match(/\(.*,.*,.*\)/g);

				state.value = (Array.isArray(power) && power.length > 0);

				if(Array.isArray(colors) && colors.length > 0)
				{
					var converted = colors[0].slice(1).slice(0, -1).split(',').map((item) => item.trim());

					converted = service.setChannels(converted);
					
					converted = convert.rgb.hsv(converted);

					if(converted != null)
					{
						state.hue = converted[0];
						state.saturation = converted[1];
						state.brightness = converted[2];
					}
				}
			}

			state.connection = !offline;

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
					if(accessory[1].services[i].type.startsWith('rgb'))
					{
						this.getDevice(accessory[1].service[parseInt(i) + 1], (state) => {
							
							if(accessory[1].service[parseInt(i) + 1].setConnectionState != null
							&& accessory[1].service[parseInt(i) + 1].updateState != null)
							{
								accessory[1].service[parseInt(i) + 1].setConnectionState(state.connection,
									() => accessory[1].service[parseInt(i) + 1].updateState(state), true);
							}
						});
					}
				}
			}
			else if(accessory[1].services instanceof Object)
			{
				if(accessory[1].services.type.startsWith('rgb'))
				{
					this.getDevice(accessory[1].service[1], (state) => {
						
						if(accessory[1].service[1].setConnectionState != null
						&& accessory[1].service[1].updateState != null)
						{
							accessory[1].service[1].setConnectionState(state.connection,
								() => accessory[1].service[1].updateState(state), true);
						}
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
			
			this.logger.debug(stdOut);
			
			if(err)
			{
				this.logger.log('error', 'bridge', 'Bridge', '%execution_error% [flux_led.py]', err);
			}

			if(callback)
			{
				callback(err != null || (stdOut != null && (stdOut.includes('Errno 113') || stdOut.includes('Unable to connect to bulb'))), stdOut);
			}
		});
	}
}