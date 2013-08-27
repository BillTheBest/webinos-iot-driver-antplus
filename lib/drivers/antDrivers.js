/*******************************************************************************
 *  Code contributed to the webinos project
 * 
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *  
 *     http://www.apache.org/licenses/LICENSE-2.0
 *  
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * 
 * Author: Ziran Sun - ziran.sun@samsung.com
 * 
 ******************************************************************************/

(function () {
    'use strict';

    var serialport_module = require('serialport');
    var serialPort = serialport_module.SerialPort;
    var net = require('net');
	var path = require("path");
    var fs = require("fs");
    
    var SERIAL_PORT;
    var SERIAL_RATE;
    
    var driverId = null;
    var registerFunc = null;
    var removeFunc = null;
    var callbackFunc = null;

    var elementsList = new Array;
    var elementId = -1;
    var serial = null;
    
    elementsList[0] = {
        'type': 'antheartratemonitor',
        'name': 'GARMIN HRM',
        'description': 'GARMIN ANT+ heart rate monitor',
        'sa': 0,
        'interval': 1000,
        'value': 0,
        'running': false,
        'id': 0
    };
    
    elementsList[1] = {
        'type': 'weightscale',
        'name': 'smartLAB weight',
        'description': 'smartLAB ANT+ weight scale',
        'sa': 0,
        'interval': 1000,
        'value': 0,
        'running': false,
        'id': 0
    };
    
    elementsList[2] = {
        'type': 'bloodsugar',
        'name': 'smartLAB BloodSugar Monitor',
        'description': 'smartLAB BloodSugar monitor',
        'sa': 0,
        'interval': 1000,
        'value': 0,
        'running': false,
        'id': 0
    };
    
    elementsList[3] = {
        'type': 'bloodpressure',
        'name': 'smartLAB BloodPressure Monitor',
        'description': 'smartLAB ANT BloodPressure monitor',
        'sa': 0,
        'interval': 1000,
        'value': 0,
        'running': false,
        'id': 0
    };

    exports.init = function(dId, regFunc, remFunc, cbkFunc) {
        console.log('Ant sensor init - id is '+dId);
        driverId = dId;
        registerFunc = regFunc;
        removeFunc = remFunc;
        callbackFunc = cbkFunc;
        setTimeout(intReg, 2000);
    };

    exports.execute = function(cmd, eId, data, errorCB, successCB) {
        switch(cmd) {
            case 'cfg':
                console.log('Ant sensor driver - Received cfg for element '+eId+', cfg is '+ JSON.stringify(data));
                var ind = -1;
                for(var i in elementsList) {
                	if(elementsList[i].id == eId)
                	{
                		console.log("eId is:" + eId);
                		ind = i;
                	}	
                };
                elementId = i;
				elementsList[ind].interval = data.rate;
			    console.log("data.rate:"  + data.rate);                                
                successCB(eId);
                break;
            case 'start':
            	console.log("ant sensor opening TCP socket");
				var client = new net.Socket();
				var HOST = "127.0.0.1";  //TODO: move to config file
				var TCP_PORT = 8168;   //TODO: move to config file
				
                var index = -1;
                for(var i in elementsList) {
                    if(elementsList[i].id == eId){
                        index = i;
                    }
                };              
                
                elementId = elementsList[index].id;
                console.log(elementsList[index]);
                console.log(JSON.stringify(elementsList[index]));
                elementsList[index].running = true; 

				//create TCP client and send connection cmd
				if(elementsList[index].running) {
                	switch(elementsList[index].type){
            			case 'antheartratemonitor':
            				client.destroy();
							client.connect(TCP_PORT, HOST, function() {
			    				client.write('X-set-channel: 0h,1');
							}); 
							client.on('data', function(data) {
  								console.log(data.toString());
  							client.end();
							});
		
                		break;
            			case 'weightscale':
            				client.destroy();
            				client.connect(TCP_PORT, HOST, function() {
			    				client.write('X-set-channel: 0w,1');
							});
							 
		                break;
		                case 'bloodsugar':
            				client.destroy();
            				client.connect(TCP_PORT, HOST, function() {
			    				client.write('X-set-channel: 0g,1');
							});
							 
		                break;
		                case 'bloodpressure':
            				client.destroy();
            				client.connect(TCP_PORT, HOST, function() {
			    				client.write('X-set-channel: 0b,1');
							});
							 
		                break;
			            default:
			                //elementsList[index].value = '-1';
			                console.log("ziran-default");
		        	}; 
        		}
                
                try{
                    var filePath = path.resolve(__dirname, "../../config.json");
                    fs.readFile(filePath, function(err,data) {
                        if (!err) {
                            var settings = JSON.parse(data.toString());
                            var drivers = settings.params.drivers;
                            for(var i in drivers){
                                if(drivers[i].type == "serial"){
                                    SERIAL_PORT = drivers[i].interfaces[0].port;
                                    SERIAL_RATE = drivers[i].interfaces[0].rate;
                                    break;
                                }
                            }
							
                            try{
                            	if(serial === null)
                                	serial = new serialPort(SERIAL_PORT, {baudrate: SERIAL_RATE}, false);

                                serial.open(function () {
                                    serial.on('close', function (err) {
                                        console.log("Serial port ["+SERIAL_PORT+"] was closed");
                                        
                                    });

                                    serial.on('error', function (err) {
                                        if(err.path == SERIAL_PORT){
                                            console.log("Serial port ["+SERIAL_PORT+"] is not ready. Err code : "+err.code);  
                                        }
                                    });
                                    start_serial(index);
                                });

                            }
                            catch(e){
                                console.log("catch : " + e);
                            }
                        }
                    });
                }
                catch(err){
                    console.log("Error : "+err);
                }  
                break;
            case 'stop':
                //In this case the sensor should stop data acquisition
                //the parameter data can be ignored
                console.log('ant driver - Received stop for element '+eId);
                var index = -1;
                console.log("eId: " + eId);
                for(var i in elementsList) {
                    if(elementsList[i].id == eId)
                        index = i;
                };
                console.log("elementsList[i].id:" + elementsList[i].id);
                elementsList[index].running = false;
                serial.close();
                break;
            case 'value':
                console.log('Received value for element '+eId+'; value is '+data);
                break;
            default:
                console.log('ant driver - unrecognized cmd');
        }
    };

	function openserial() {
		console.log("calling openserial");
		try{
			var filePath = path.resolve(__dirname, "../../config.json");
			fs.readFile(filePath, function(err,data) {
                if (!err) {
                    var settings = JSON.parse(data.toString());
                    var drivers = settings.params.drivers;
                    for(var i in drivers){
                        if(drivers[i].type == "serial"){
                            SERIAL_PORT = drivers[i].interfaces[0].port;
                            SERIAL_RATE = drivers[i].interfaces[0].rate;
                            break;
                        }
                    }
                    try{
                        serial = new serialPort(SERIAL_PORT, {baudrate: SERIAL_RATE}, false);
                     }
                    catch(e){
                        console.log("catch : " + e);
                    }
                }
            });
        }
        catch(err){
            console.log("Error : "+err);
        }
	}

    function start_serial(elementIndex){
        switch(elementsList[elementIndex].type) {
			case 'antheartratemonitor':
				serial.on( "data", function( chunk ) {
					//only care about data message - lenght 13
        			if(chunk.length == 13){
        				for(var i=0; i<chunk.length; i++){
        					var value = chunk[11];
        					if(value != undefined){
                    			elementsList[elementIndex].value = value;
                    			callbackFunc('data', elementsList[elementIndex].id, elementsList[elementIndex].value);
                    			console.log("elementsList[elementIndex].id 6:" + elementsList[elementIndex].id); 
                			}
            			}
          			}  
				});
                break;
			case 'weightscale':
					serial.on( "data", function( chunk ) {
					var value;
					//TODO: need to read more values - check on different messages 
					if(chunk.length == 13){
						for(var i=0; i<chunk.length; i++){
							if(chunk[5] == 1)   //chunk[5]?
						    {
								//get bytes [11] & [12] for weight
								var value = (chunk[11] * 256 + chunk[12])/100;
								console.log("weight is:" + value);
							}
							else if(chunk[5] == 2)
							{
								//Hydration - chunk[9] & chunk[10]
								var hydra = (chunk[9] * 256 + chunk[10])/10000; 
								console.log("hydration is:" + hydra);
								
								//bodyfat- chunk[11] & chunk[12]
								var bf = (chunk[11] * 256 + chunk[12])/10000;
								console.log("body fata is:" + bf);
							}
							//Metabolic Information
							else if(chunk[5] == 3)
							{
							  //Active Metabolic Rate - chunk[9] & chunk[10]
							  var active_meta = (chunk[9] * 256 + chunk[10])/4;
							  console.log("Active Metabolic rate:" + active_meta); 
							  //Basal Metabolic Rate  - chunk[11] & chunk[12]
							  var basal_meta = (chunk[11] * 256 + chunk[12])/4;
							  console.log("Basal Metabolic rate:" + basal_meta);
							}
							//Body Composition Mass
							else if(chunk[5] == 4)
							{
								//Muscle Mass - chunk[10] & chunk[11]
								var muscle_mass = (chunk[1] * 256 + chunk[11])/100;
								console.log("Muscle Mass is:" + muscle_mass);
								//Bone Mass - chunk[12]
								var bone_mass = chunk[12]/10;
								console.log("Bone Mass is:" + bone_mass);
							}
						}
					}
				});
				break;
			case 'bloodsugar':
					serial.on( "data", function( chunk ) {
					var value;
					if(chunk.length == 13){
						for(var i=0; i<chunk.length; i++){
							//Concentration value
							if(chunk[5] == 1)   
						    {
								//data & timestamp chunk[6]-chunk[9] interested?
								//Concentration - chunk[11] & chunk[12]	
								var value = chunk[11] * 256 + chunk[12];
								console.log("bloodsugar concentration is:" + value + "mg/dL");							
							}
							//Average value
							if(chunk[5] == 2)
							{
								//7 days avergae: chunk[6] & chunk[7]
								var avg_7 = chunk[6] * 256 + chunk[7];
								console.log("7 days average bloodsugar is:" + avg_7 + "mg/dL");
								//14 days average: chunk[8] & chunk[9]
								var avg_14 = chunk[8] * 256 + chunk[9];
								console.log("14 days average bloodsugar is:" + avg_14 + "mg/dL");
								//28 days average: chunk[10] & chunk[11]
								var avg_28 = chunk[10] * 256 + chunk[11];
								console.log("28 days average bloodsugar is:" + avg_28 + "mg/dL");
							} 
						}
					}
				});
				break;
			case 'bloodpressure':
					serial.on( "data", function( chunk ) {
					//Refer blood pressure FIT file format  
					
				});
			
				break;
			default:
				break;
        };
 	}
	           
    function intReg() {
        console.log('\nAnt driver - register new elements');
        for(var i in elementsList) {
            var json_info = {type:elementsList[i].type, name:elementsList[i].name, description:elementsList[i].description, range:elementsList[i].range};
            elementsList[i].id = registerFunc(driverId, elementsList[i].sa, json_info);
        };
    }
    
}());