const { SwitchService } = require('homebridge-syntex-dynamic-platform');

const lightAgent = require('../lib/lightAgent');
const cp = require('child_process');
const path = require('path');

module.exports = class Switch extends SwitchService
{
    constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.deviceConfig = deviceConfig;
    }

    executeCommand(address, command, callback)
	{
		const exec = cp.exec;
		const cmd = path.join(__dirname, '../flux_led.py ' + lightAgent.getAddress(address) + command);

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