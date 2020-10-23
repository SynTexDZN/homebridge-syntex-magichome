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
		this.services = this.getAccessoryServices();

		this.services.push(this.getInformationService());
	}
	/*
	identify(callback)
	{
		callback();
	}
	*/
	getInformationService()
	{
		var informationService = new this.homebridge.Service.AccessoryInformation();

		informationService.setCharacteristic(this.homebridge.Characteristic.Manufacturer, 'SynTex')
			.setCharacteristic(this.homebridge.Characteristic.Model, this.getModelName())
			.setCharacteristic(this.homebridge.Characteristic.SerialNumber, this.mac);

		return informationService;
	}

	executeCommand(address, command, callback)
	{
		const exec = cp.exec;
		const self = this;
		const cmd = path.join(__dirname, '../flux_led.py ' + lightAgent.getAddress(address) + command);

		if(self.homebridge.debug)
		{
			logger.debug(cmd);
		}

		exec(cmd, (err, stdOut) => {

			if(self.homebridge.debug)
			{
				logger.debug(stdOut);
			}

			logger.debug(err);

			if(callback)
			{
				callback(err, stdOut);
			}
		});
	}

	getAccessoryServices()
	{
		throw new Error('The getAccessoryServices method must be overridden.');
	}

	getModelName()
	{
		throw new Error('The getModelName method must be overridden.');
	}

	getServices()
	{
		return this.services;
	}
}