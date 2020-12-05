const { BaseService } = require('homebridge-syntex-dynamic-platform');

const cp = require('child_process');
const path = require('path');
const lightAgent = require('../lib/lightAgent');

module.exports = class Accessory
{
	constructor(config, log, homebridge, manager)
	{
		this.logger = log;
		this.DeviceManager = manager;
		
		this.homebridge = homebridge;
		this.config = config;
		this.mac = config.mac;
		this.name = config.name;
		this.services = config.services;
		this.service = this.getAccessoryServices();
	}
	/*
	identify(callback)
	{
		callback();
	}
	*/

	executeCommand(address, command, callback)
	{
		const exec = cp.exec;
		const self = this;
		const cmd = path.join(__dirname, '../flux_led.py ' + lightAgent.getAddress(address) + command);

		if(self.homebridge.debug)
		{
			self.logger.debug(cmd);
		}

		exec(cmd, (err, stdOut) => {

			if(self.homebridge.debug)
			{
				self.logger.debug(stdOut);
			}

			if(err)
			{
				self.logger.log('error', 'bridge', 'Bridge', 'Es fehlen Berechtigungen zum Ausführen von [flux_led.py] ' + err);
			}

			if(callback)
			{
				callback(err, stdOut);
			}
		});
	}
}