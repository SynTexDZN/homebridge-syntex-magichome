const { SwitchService } = require('homebridge-syntex-dynamic-platform');

let Characteristic, DeviceManager;

const preset = require('../presets');
const emitter = require('../lib/emitter');
const cp = require('child_process');
const path = require('path');
const lightAgent = require('../lib/lightAgent');

module.exports = class PresetSwitch extends SwitchService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Characteristic = manager.platform.api.hap.Characteristic;
		DeviceManager = manager.DeviceManager;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);
		
		this.isOn = false;
		//this.name = deviceConfig.name || 'LED Controller Presets';
		this.ips = Object.keys(deviceConfig.ips);
		this.preset = deviceConfig.preset || 'seven_color_cross_fade';
		this.sceneValue = preset[this.preset];
		this.deviceConfig = deviceConfig;

		//this.letters = '40';

		if(this.sceneValue == null)
		{
			this.logger.log('warn', 'bridge', 'Bridge', 'Das Preset [' + this.preset + '] wurde nicht gefunden. Es wird das Default-Preset [seven_color_cross_fade] verwendet!');
			this.sceneValue = 37;
		}

		this.speed = deviceConfig.speed || 40;
		this.shouldTurnOff = deviceConfig.shouldTurnOff || false;
		this.bindEmitter();

		this.changeHandler = (function(state)
		{
			this.setState(state, () => {});

		}).bind(this);

		DeviceManager.getDevice(this.mac, this.letters).then(function(state) {

			if(state == null)
			{
				this.logger.log('error', this.mac, this.letters, '[' + this.name + '] wurde nicht in der Storage gefunden! ( ' + this.mac + ' )');
			}
			else if(state != null)
			{
				this.logger.log('read', this.mac, this.letters, 'HomeKit Status für [' + this.name + '] ist [' + state + '] ( ' + this.mac + ' )');

				this.isOn = state;

				//this.service[0].getCharacteristic(Characteristic.On).updateValue(this.isOn);
			}

		}.bind(this));
	}

	bindEmitter()
	{
		const self = this;

		emitter.on('MagicHomeSynTexPresetTurnedOn', (presetName) => {

			if(presetName !== self.name)
			{
				self.updateState(false);
			}
		})
	}

	sendCommand(command, callback)
	{
		this.executeCommand(this.ips, command, callback);
	}

	setState(newState, callback)
	{
		this.isOn = newState;
		this.power = newState;

		const self = this;

		if(newState === true)
		{
			// Turn Off Other Running Scenes
			emitter.emit('MagicHomeSynTexPresetTurnedOn', self.name);

			self.sendCommand('--on', () => {

				setTimeout(() => self.sendCommand('-p ' + self.sceneValue + ' ' + self.speed, () => {

					//DeviceManager.setDevice(self.mac, self.letters, true);

					super.setState(true, () => {

						this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [' + this.power + '] ( ' + this.id + ' )');
					
						callback();
					});

				}, 3000));
			});
		}
		else
		{
			// Turning OFF
			var promiseArray = [];

			Object.keys(self.deviceConfig.ips).forEach((ip) => {

				const newPromise = new Promise((resolve) => {

					self.executeCommand(ip, ' -c ' + self.deviceConfig.ips[ip], () => {

						DeviceManager.setDevice(self.mac, self.letters, false);

						resolve();
					});
				});

				promiseArray.push(newPromise);
			});

			Promise.all(promiseArray).then(() => {

				if(self.shouldTurnOff)
				{
					setTimeout(() => self.sendCommand('--off', () => {

						super.setState(false, () => {

							this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [' + this.power + '] ( ' + this.id + ' )');
						
							callback();
						});

					}, 3000));
				}
				else
				{
					this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [' + this.power + '] ( ' + this.id + ' )');

					callback();
				}
			});
		}
	}

	updateState(newValue)
	{
		this.isOn = newValue;
		this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.On).updateValue(this.isOn);
		DeviceManager.setDevice(this.mac, this.letters, this.isOn);
	}

	getState(callback)
    {
        super.getState((state) => {

            if(state != null)
            {
                this.power = state;

                callback(null, this.power);
            }
            else
            {
				DeviceManager.getDevice(this.mac, this.letters).then((state) => {

					if(state != null)
                    {
                        this.power = state;

                        this.logger.log('read', this.id, this.letters, 'HomeKit Status für [' + this.name + '] ist [' + this.power + '] ( ' + this.id + ' )');
                    
                        super.setValue('state', this.power);
                    }
                    
                    callback(null, state != null ? state : false);
				});
            }
        });
	}
	
	executeCommand(address, command, callback)
	{
		const exec = cp.exec;
		const self = this;
		const cmd = path.join(__dirname, '../flux_led.py ' + lightAgent.getAddress(address) + command);
		/*
		if(self.homebridge.debug)
		{
			self.logger.debug(cmd);
		}
		*/
		exec(cmd, (err, stdOut) => {
			/*
			if(self.homebridge.debug)
			{
				self.logger.debug(stdOut);
			}
			*/
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