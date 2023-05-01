const cp = require('child_process'), path = require('path'), convert = require('color-convert');

module.exports = class DeviceManager
{
	constructor(platform)
	{
		this.logger = platform.logger;

		this.TypeManager = platform.TypeManager;
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

	getDevices(ips, callback)
	{
		this.executeCommand(ips, '-i', (error, output) => {
			
			var data = output.split('\n'), states = {};

			data.pop();

			this.logger.debug(data);

			for(const i in data)
			{
				var ip = data[i].match(/([0-9]*\.){3}[0-9]*|([A-F]|[0-9]){12}|(([0-9]|[a-f])*:){7}([0-9]|[a-f])*/g);

				if(Array.isArray(ip) && ip.length > 0)
				{
					var offline = data[i].includes('Unable to connect to bulb'), state = {};

					ip = ip[0];

					if(!offline)
					{
						var power = data[i].match(/\] ON /g),
							colors = data[i].match(/\(.*,.*,.*\)/g);

						state.value = (Array.isArray(power) && power.length > 0);

						if(Array.isArray(colors) && colors.length > 0)
						{
							var converted = colors[0].slice(1).slice(0, -1).split(',').map((item) => item.trim());

							state.red = converted[0];
							state.green = converted[1];
							state.blue = converted[2];
						}
					}

					state.connection = !offline;

					states[ip] = state;
				}
			}

			callback(states);

		}, false);
	}

	refreshAccessories(accessories)
	{
		var ips = [];

		this.logger.debug('%device_refresh% ..');

		for(const accessory of accessories)
		{
			for(const service of accessory[1].service)
			{
				if(this.TypeManager.letterToType(service.letters) == 'rgb' && service.ip != null && !ips.includes(service.ip))
				{
					ips.push(service.ip);
				}
			}
		}

		this.getDevices(ips.join(' '), (states) => {

			for(const ip in states)
			{
				for(const accessory of accessories)
				{
					for(const service of accessory[1].service)
					{
						if(this.TypeManager.letterToType(service.letters) == 'rgb' && service.ip == ip)
						{
							if(service.setConnectionState != null && service.updateState != null)
							{
								var converted = service.setChannels([states[ip].red, states[ip].green, states[ip].blue]);

								converted = convert.rgb.hsv(converted);

								if(converted != null)
								{
									delete states[ip].red;
									delete states[ip].green;
									delete states[ip].blue;

									states[ip].hue = converted[0];
									states[ip].saturation = converted[1];
									states[ip].brightness = converted[2];
								}

								service.setConnectionState(states[ip].connection,
									() => service.updateState(states[ip]), true);
							}
						}
					}
				}
			}
		});
	}

	executeCommand(address, command, callback, verbose = true)
	{
		const exec = cp.exec;
		const cmd = path.join(__dirname, './flux_led.py ' + address + ' ' + command);

		exec(cmd, (err, stdOut) => {
			
			if(verbose)
			{
				this.logger.debug(stdOut);
			}
			
			if(err)
			{
				this.logger.log('error', 'bridge', 'Bridge', '%execution_error% [flux_led.py]', err);
			}

			if(callback != null)
			{
				callback(err != null || (stdOut != null && (stdOut.includes('Errno 113') || stdOut.includes('Unable to connect to bulb'))), stdOut);
			}
		});
	}
}