/**
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

var should = require("should");
var request = require('supertest');
var express = require('express');
var sinon = require('sinon');
var when = require('when');

var app = express();
var redNodes = require("../../../red/nodes");
var server = require("../../../red/server");
var settings = require("../../../red/settings");

var nodes = require("../../../red/api/nodes");

describe("nodes api", function() {
        
    var app;

    before(function() {
        app = express();
        app.use(express.json());
        app.get("/nodes",nodes.getAll);
        app.post("/nodes",nodes.post);
        app.get("/nodes/:id",nodes.get);
        app.put("/nodes/:id",nodes.put);
        app.delete("/nodes/:id",nodes.delete);
    });
    
    describe('get nodes', function() {
        it('returns node list', function(done) {
            var getNodeList = sinon.stub(redNodes,'getNodeList', function() {
                return [1,2,3];
            });
            request(app)
                .get('/nodes')
                .set('Accept', 'application/json')
                .expect(200)
                .end(function(err,res) {
                    getNodeList.restore();
                    if (err) {
                        throw err;
                    }
                    res.body.should.be.an.Array.and.have.lengthOf(3);
                    done();
                });
        });
        
        it('returns node configs', function(done) {
            var getNodeConfigs = sinon.stub(redNodes,'getNodeConfigs', function() {
                return "<script></script>";
            });
            request(app)
                .get('/nodes')
                .set('Accept', 'text/html')
                .expect(200)
                .expect("<script></script>")
                .end(function(err,res) {
                    getNodeConfigs.restore();
                    if (err) {
                        throw err;
                    }
                    done();
                });
        });
        
        it('returns an individual node info', function(done) {
            var getNodeInfo = sinon.stub(redNodes,'getNodeInfo', function(id) {
                return {"123":{id:"123"}}[id];
            });
            request(app)
                .get('/nodes/123')
                .set('Accept', 'application/json')
                .expect(200)
                .end(function(err,res) {
                    getNodeInfo.restore();
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.property("id","123");
                    done();
                });
        });
        
        it('returns an individual node configs', function(done) {
            var getNodeConfig = sinon.stub(redNodes,'getNodeConfig', function(id) {
                return {"123":"<script></script>"}[id];
            });
            request(app)
                .get('/nodes/123')
                .set('Accept', 'text/html')
                .expect(200)
                .expect("<script></script>")
                .end(function(err,res) {
                    getNodeConfig.restore();
                    if (err) {
                        throw err;
                    }
                    done();
                });
        });
        
        it('returns 404 for unknown node', function(done) {
            var getNodeInfo = sinon.stub(redNodes,'getNodeInfo', function(id) {
                return {"123":{id:"123"}}[id];
            });
            request(app)
                .get('/nodes/456')
                .set('Accept', 'application/json')
                .expect(404)
                .end(function(err,res) {
                    getNodeInfo.restore();
                    if (err) {
                        throw err;
                    }
                    done();
                });
        });
    });
    
    describe('install', function() {
        
        it('returns 400 if settings are unavailable', function(done) {
            var settingsAvailable = sinon.stub(settings,'available', function() {
                return false;
            });
            request(app)
                .post('/nodes')
                .expect(400)
                .end(function(err,res) {
                    settingsAvailable.restore();
                    if (err) {
                        throw err;
                    }
                    done();
                });
        });

        it('returns 400 if request is invalid', function(done) {
            var settingsAvailable = sinon.stub(settings,'available', function() {
                return true;
            });
            request(app)
                .post('/nodes')
                .send({})
                .expect(400)
                .end(function(err,res) {
                    settingsAvailable.restore();
                    if (err) {
                        throw err;
                    }
                    done();
                });
        });
        
        describe('by module', function() {
            it('installs the module and returns node info', function(done) {
                var settingsAvailable = sinon.stub(settings,'available', function() {
                    return true;
                });
                var getNodeModuleInfo = sinon.stub(redNodes,'getNodeModuleInfo',function(id) {
                    return null;
                });
                var installModule = sinon.stub(server,'installModule', function() {
                    return when.resolve({id:"123"});
                });
                
                request(app)
                    .post('/nodes')
                    .send({module: 'foo'})
                    .expect(200)
                    .end(function(err,res) {
                        settingsAvailable.restore();
                        getNodeModuleInfo.restore();
                        installModule.restore();
                        if (err) {
                            throw err;
                        }
                        res.body.should.have.property("id","123");
                        done();
                    });
            });
            
            it('fails the install if already installed', function(done) {
                var settingsAvailable = sinon.stub(settings,'available', function() {
                    return true;
                });
                var getNodeModuleInfo = sinon.stub(redNodes,'getNodeModuleInfo',function(id) {
                    return {id:"123"};
                });
                var installModule = sinon.stub(server,'installModule', function() {
                    return when.resolve({id:"123"});
                });
                
                request(app)
                    .post('/nodes')
                    .send({module: 'foo'})
                    .expect(400)
                    .end(function(err,res) {
                        settingsAvailable.restore();
                        getNodeModuleInfo.restore();
                        installModule.restore();
                        if (err) {
                            throw err;
                        }
                        done();
                    });
            });
            
            it('fails the install if module error', function(done) {
                var settingsAvailable = sinon.stub(settings,'available', function() {
                    return true;
                });
                var getNodeModuleInfo = sinon.stub(redNodes,'getNodeModuleInfo',function(id) {
                    return null;
                });
                var installModule = sinon.stub(server,'installModule', function() {
                    return when.reject(new Error("test error"));
                });
                
                request(app)
                    .post('/nodes')
                    .send({module: 'foo'})
                    .expect(400)
                    .end(function(err,res) {
                        settingsAvailable.restore();
                        getNodeModuleInfo.restore();
                        installModule.restore();
                        if (err) {
                            throw err;
                        }
                        res.text.should.equal("Error: test error");
                        done();
                    });
            });
            it('fails the install if module not found', function(done) {
                var settingsAvailable = sinon.stub(settings,'available', function() {
                    return true;
                });
                var getNodeModuleInfo = sinon.stub(redNodes,'getNodeModuleInfo',function(id) {
                    return null;
                });
                var installModule = sinon.stub(server,'installModule', function() {
                    var err = new Error("test error");
                    err.code = 404;
                    return when.reject(err);
                });
                
                request(app)
                    .post('/nodes')
                    .send({module: 'foo'})
                    .expect(404)
                    .end(function(err,res) {
                        settingsAvailable.restore();
                        getNodeModuleInfo.restore();
                        installModule.restore();
                        if (err) {
                            throw err;
                        }
                        done();
                    });
            });
        });
    });
    describe('delete', function() {
         it('returns 400 if settings are unavailable', function(done) {
            var settingsAvailable = sinon.stub(settings,'available', function() {
                return false;
            });
            request(app)
                .del('/nodes/123')
                .expect(400)
                .end(function(err,res) {
                    settingsAvailable.restore();
                    if (err) {
                        throw err;
                    }
                    done();
                });
        });
         
        describe('by module', function() {
            it('uninstalls the module and returns node info', function(done) {
                var settingsAvailable = sinon.stub(settings,'available', function() {
                    return true;
                });
                var getNodeInfo = sinon.stub(redNodes,'getNodeInfo',function(id) {
                    return null;
                });
                var getNodeModuleInfo = sinon.stub(redNodes,'getNodeModuleInfo',function(id) {
                    return {id:"123"};
                });
                var uninstallModule = sinon.stub(server,'uninstallModule', function() {
                    return when.resolve({id:"123"});
                });
                
                request(app)
                    .del('/nodes/foo')
                    .expect(200)
                    .end(function(err,res) {
                        settingsAvailable.restore();
                        getNodeInfo.restore();
                        getNodeModuleInfo.restore();
                        uninstallModule.restore();
                        if (err) {
                            throw err;
                        }
                        res.body.should.have.property("id","123");
                        done();
                    });
            });
            
            it('fails the uninstall if the module is not installed', function(done) {
                var settingsAvailable = sinon.stub(settings,'available', function() {
                    return true;
                });
                var getNodeInfo = sinon.stub(redNodes,'getNodeInfo',function(id) {
                    return null;
                });
                var getNodeModuleInfo = sinon.stub(redNodes,'getNodeModuleInfo',function(id) {
                    return null;
                });
                
                request(app)
                    .del('/nodes/foo')
                    .expect(404)
                    .end(function(err,res) {
                        settingsAvailable.restore();
                        getNodeInfo.restore();
                        getNodeModuleInfo.restore();
                        if (err) {
                            throw err;
                        }
                        done();
                    });
            });

            it('fails the uninstall if the module is not installed', function(done) {
                var settingsAvailable = sinon.stub(settings,'available', function() {
                    return true;
                });
                var getNodeInfo = sinon.stub(redNodes,'getNodeInfo',function(id) {
                    return null;
                });
                var getNodeModuleInfo = sinon.stub(redNodes,'getNodeModuleInfo',function(id) {
                    return {id:"123"};
                });
                var uninstallModule = sinon.stub(server,'uninstallModule', function() {
                    return when.reject(new Error("test error"));
                });

                request(app)
                    .del('/nodes/foo')
                    .expect(400)
                    .end(function(err,res) {
                        settingsAvailable.restore();
                        getNodeInfo.restore();
                        getNodeModuleInfo.restore();
                        uninstallModule.restore();
                        if (err) {
                            throw err;
                        }
                        res.text.should.equal("Error: test error");
                        done();
                    });
            });
        });

    });
    
    describe('enable/disable', function() {
        it('returns 400 if settings are unavailable', function(done) {
            var settingsAvailable = sinon.stub(settings,'available', function() {
                return false;
            });
            request(app)
                .put('/nodes/123')
                .expect(400)
                .end(function(err,res) {
                    settingsAvailable.restore();
                    if (err) {
                        throw err;
                    }
                    done();
                });
        });
        
        it('returns 400 for invalid payload', function(done) {
            var settingsAvailable = sinon.stub(settings,'available', function() {
                return true;
            });

            request(app)
                .put('/nodes/foo')
                .send({})
                .expect(400)
                .end(function(err,res) {
                    settingsAvailable.restore();
                    if (err) {
                        throw err;
                    }
                    res.text.should.equal("Invalid request");

                    done();
                });
        });
        it('returns 404 for unknown node', function(done) {
            var settingsAvailable = sinon.stub(settings,'available', function() {
                return true;
            });
            var getNodeInfo = sinon.stub(redNodes,'getNodeInfo',function(id) {
                return null;
            });

            request(app)
                .put('/nodes/foo')
                .send({enabled:false})
                .expect(404)
                .end(function(err,res) {
                    settingsAvailable.restore();
                    getNodeInfo.restore();
                    if (err) {
                        throw err;
                    }
                    done();
                });
        });
        
        it('enables disabled node', function(done) {
            var settingsAvailable = sinon.stub(settings,'available', function() {
                return true;
            });
            var getNodeInfo = sinon.stub(redNodes,'getNodeInfo',function(id) {
                return {id:"123",enabled: false};
            });
            var enableNode = sinon.stub(redNodes,'enableNode',function(id) {
                return {id:"123",enabled: true,types:['a']};
            });

            request(app)
                .put('/nodes/foo')
                .send({enabled:true})
                .expect(200)
                .end(function(err,res) {
                    settingsAvailable.restore();
                    getNodeInfo.restore();
                    enableNode.restore();
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.property("id","123");
                    res.body.should.have.property("enabled",true);
                    
                    done();
                });
        });
        it('disables enabled node', function(done) {
            var settingsAvailable = sinon.stub(settings,'available', function() {
                return true;
            });
            var getNodeInfo = sinon.stub(redNodes,'getNodeInfo',function(id) {
                return {id:"123",enabled: true};
            });
            var disableNode = sinon.stub(redNodes,'disableNode',function(id) {
                return {id:"123",enabled: false,types:['a']};
            });

            request(app)
                .put('/nodes/foo')
                .send({enabled:false})
                .expect(200)
                .end(function(err,res) {
                    settingsAvailable.restore();
                    getNodeInfo.restore();
                    disableNode.restore();
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.property("id","123");
                    res.body.should.have.property("enabled",false);
                    
                    done();
                });
        });
        describe('no-ops if already in the right state', function() {
            function run(state,done) {
                var settingsAvailable = sinon.stub(settings,'available', function() {
                    return true;
                });
                var getNodeInfo = sinon.stub(redNodes,'getNodeInfo',function(id) {
                    return {id:"123",enabled: state};
                });
                var enableNode = sinon.stub(redNodes,'enableNode',function(id) {
                    return {id:"123",enabled: true,types:['a']};
                });
    
                var disableNode = sinon.stub(redNodes,'disableNode',function(id) {
                    return {id:"123",enabled: false,types:['a']};
                });
    
                request(app)
                    .put('/nodes/foo')
                    .send({enabled:state})
                    .expect(200)
                    .end(function(err,res) {
                        settingsAvailable.restore();
                        getNodeInfo.restore();
                        var enableNodeCalled = enableNode.called;
                        var disableNodeCalled = disableNode.called;
                        enableNode.restore();
                        disableNode.restore();
                        if (err) {
                            throw err;
                        }
                        enableNodeCalled.should.be.false;
                        disableNodeCalled.should.be.false;
                        res.body.should.have.property("id","123");
                        res.body.should.have.property("enabled",state);
                        
                        done();
                    });
            }
            it('already enabled', function(done) {
                run(true,done);
            });
            it('already disabled', function(done) {
                run(false,done);
            });
        });
        describe('does not no-op if err on node', function() {
            function run(state,done) {
                var settingsAvailable = sinon.stub(settings,'available', function() {
                    return true;
                });
                var getNodeInfo = sinon.stub(redNodes,'getNodeInfo',function(id) {
                    return {id:"123",enabled: state, err:"foo" };
                });
                var enableNode = sinon.stub(redNodes,'enableNode',function(id) {
                    return {id:"123",enabled: true,types:['a']};
                });
    
                var disableNode = sinon.stub(redNodes,'disableNode',function(id) {
                    return {id:"123",enabled: false,types:['a']};
                });
    
                request(app)
                    .put('/nodes/foo')
                    .send({enabled:state})
                    .expect(200)
                    .end(function(err,res) {
                        settingsAvailable.restore();
                        getNodeInfo.restore();
                        var enableNodeCalled = enableNode.called;
                        var disableNodeCalled = disableNode.called;
                        enableNode.restore();
                        disableNode.restore();
                        if (err) {
                            throw err;
                        }
                        enableNodeCalled.should.be.equal(state);
                        disableNodeCalled.should.be.equal(!state);
                        res.body.should.have.property("id","123");
                        res.body.should.have.property("enabled",state);
                        
                        done();
                    });
            }
            it('already enabled', function(done) {
                run(true,done);
            });
            it('already disabled', function(done) {
                run(false,done);
            });
        });
    });
    
    
});