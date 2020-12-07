const { SwitchService } = require('homebridge-syntex-dynamic-platform');

module.exports = class Switch extends SwitchService
{
    constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.deviceConfig = deviceConfig;
		
		this.ips = Object.keys(deviceConfig.ips);
		this.shouldTurnOff = deviceConfig.shouldTurnOff || false;
    }
}