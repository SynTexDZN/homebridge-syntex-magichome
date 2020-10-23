const cp = require('child_process')
const path = require('path')

const cacheKey = 'magicHomeSynTex_cache'
const spawn = cp.spawn;

var logger = null;

const LightAgent = class {

	constructor()
	{
		this.cachedAddress = {};
		this.pollingInterval = 300 * 1000;
		this.storage = null;
		this.hasDiscoveryStarted = false;
		this.isVerbose = false;
		this.shouldDiscover = true;
	}

	getCachedAddress()
	{
		if(!this.storage)
		{
			return {};
		}

		logger.debug('Getting Bulbs from Cache');

		return this.storage.getItem(cacheKey).then((data) => {

			var devices = {};

			if(data)
			{
				try
				{
					devices = JSON.parse(data);
				}
				catch(error)
				{
					logger.log('error', 'bridge', 'Bridge', 'JSON String konnte nicht verarbeitet werden! ( ' + data + ')');
				}
			}

			logger.debug(' ** Fetched Lights from Cache **');

			if(this.isVerbose)
			{
				logger.debug(devices);
			}
			
			return devices;
		});
	}

	saveAddress(res)
	{
		if(this.storage)
		{
			const data = JSON.stringify(res);

			logger.debug('Saving Lights');
			logger.debug(data);

			this.storage.setItem(cacheKey, data).then(() => {

				logger.debug('Lights Saved.');
			});
		}
	}

	disableDiscovery()
	{
		this.shouldDiscover = false;
	}

	startDiscovery()
	{
		if(!this.hasDiscoveryStarted && this.shouldDiscover)
		{
			this.hasDiscoveryStarted = true;
			this.getDevices();
		}
	}

	setLogger(log)
	{
		logger = log;
	}

	setVerbose()
	{
		this.isVerbose = true;
	}

	setPersistPath(persistPath)
	{
		if(!this.storage)
		{
			this.storage = require('node-persist');

			const self = this;

			this.storage.init({ dir: path.join(persistPath, 'syntex-magichome'), forgiveParseErrors: true, ttl: false, logging: false }).then(() => {

				return self.getCachedAddress();

			}).then((devices) => {

				self.cachedAddress = devices;
			});
		}
	}

	parseDevices(res)
	{
		if(!res)
		{
			return this.cachedAddress;
		}

		if(res.length > 0)
		{
			const lines = res.split('\n');

			if(lines.length < 3)
			{
				return this.cachedAddress;
			}

			// Format Response
			var devices = {};

			lines.splice(0, 1);
			lines.splice(-1, 1);
			lines.forEach((element) => {

				const mappedAddr = element.split('=');

				devices[mappedAddr[0]] = mappedAddr[1];
				devices[mappedAddr[1]] = mappedAddr[1];
			});

			var newDevices = this.cachedAddress;

			Object.keys(devices).forEach((element) => {

				newDevices[element] = devices[element];
			});

			// Cache IPS
			this.saveAddress(newDevices);
			return newDevices;
		}

		return this.cachedAddress;
	}

	getCachedDevice(addr)
	{
		var address = '';

		if(this.cachedAddress[addr] && this.shouldDiscover)
		{
			address = this.cachedAddress[addr];
		}
		else
		{
			address = addr;
		}

		return address + ' ';
	}

	getDevices()
	{
		try
		{
			const self = this;
			const cmd = path.join(__dirname, '../flux_led.py');

			logger.debug('Discovering Devices');
			/*
			this.proc = spawn(cmd, ['-s']);

			this.proc.stdout.on('data', (data) => {

				const newData = '' + data;
	
				logger.debug(newData);
				self.cachedAddress = self.parseDevices(newData);
			});
	
			this.proc.stderr.on('data', (data) => {
	
				logger.log('error', 'bridge', 'Bridge', 'Error : ' + data)
			});
	
			this.proc.on('close', () => {
	
				logger.debug('Discovery Finished');
				self.rediscoverLights();
			});
			*/
		}
		catch(error)
		{
			logger.log('error', 'bridge', 'Bridge', 'Es fehlen Berechtigungen zum Ausführen von [flux_led.py]');
		}
	}

	rediscoverLights()
	{
		this.proc = null;

		if(this.isVerbose)
		{
			logger.debug(this.cachedAddress);
		}

		setTimeout(this.getDevices.bind(this), this.pollingInterval);
	}

	getAddress(address)
	{
		var ips = '';

		if(typeof address === 'string')
		{
			ips = this.getCachedDevice(address);
		}
		else if(address.length > 0)
		{
			address.forEach((addr) => {

				ips += this.getCachedDevice(addr);
			});
		}

		return ips;
	}
}

const agent = new LightAgent();

module.exports = agent;