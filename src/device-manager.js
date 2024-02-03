const path = require('path'), convert = require('color-convert');

const { spawn } = require('child_process');

module.exports = class DeviceManager
{
	constructor(platform)
	{
		this.logger = platform.logger;

		this.TypeManager = platform.TypeManager;

		this.getDevices();
	}

	getDevices()
	{
		const proc = spawn('python', [path.join(__dirname, './flux_led.py'), '-s']);

		proc.stdout.on('data', (data) => {

			data = data.toString();

			this.logger.debug(data);
		});
	
		proc.stderr.on('data', (err) => {

			err = err.toString();

			this.logger.log('error', 'bridge', 'Bridge', '%execution_error% [flux_led.py]', err);
		});

		proc.on('close', () => {

			//this.updateDevices();
		});
	}

	getState(service)
	{
		return new Promise((callback) => {

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
		});
	}

	getStates(ips, callback)
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

		this.getStates(ips.join(' '), (states) => {

			for(const ip in states)
			{
				for(const accessory of accessories)
				{
					for(const service of accessory[1].service)
					{
						if(this.TypeManager.letterToType(service.letters) == 'rgb' && service.ip == ip)
						{
							if(service.updateState != null)
							{
								var state = { ...states[ip] };

								if(state.red != null && state.green != null && state.blue != null)
								{
									var converted = service.setChannels([state.red, state.green, state.blue]);

									converted = convert.rgb.hsv(converted);

									if(converted != null)
									{
										delete state.red;
										delete state.green;
										delete state.blue;

										state.hue = converted[0];
										state.saturation = converted[1];
										state.brightness = converted[2];
									}
								}

								service.updateState(state);
							}
						}
					}
				}
			}
		});
	}

	executeCommand(address, command, callback, verbose = true)
	{
		const proc = spawn('python', [path.join(__dirname, './flux_led.py'), address, command]);

		proc.stdout.on('data', (data) => {

			data = data.toString();

			if(verbose)
			{
				this.logger.debug(data);
			}

			if(callback != null)
			{
				callback(data != null && (data.includes('Errno 113') || data.includes('Unable to connect to bulb')), data);
			}
		});

		proc.stderr.on('data', (err) => {

			err = err.toString();

			this.logger.log('error', 'bridge', 'Bridge', '%execution_error% [flux_led.py]', err);

			if(callback != null)
			{
				callback(true, err);
			}
		});
	}
}