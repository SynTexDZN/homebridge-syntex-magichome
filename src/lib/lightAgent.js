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
			logger.debug(devices);
			
			return devices;
		});
	}
	
	setLogger(log)
	{
		logger = log;
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