import { config } from 'dotenv'

config({
  path: './.env.test'
})

// import { describe, test, expect } from '@jest/globals';
// import { CoreOptions } from '../src/types';
// import { validateOptions } from '../src';
// import { ValidationError } from 'checkeasy';
// import sinon from 'sinon';
// import Core from '../src/Core';

// const sandbox = sinon.createSandbox();

// afterEach(() => {
//   sandbox.restore();
// })

// describe('⚙️ Test core options', () => {
//   test('Empty options should return an empty object', () => {
//     const options: CoreOptions = {};
//     expect(validateOptions(
//       options,
//       'Test empty options validation'
//     )).toEqual({});
//   })

//   test('Right options should return exact same object', () => {
//     const options: CoreOptions = {
//       usePriorityEnvVars: true,
//       port: '3000'
//     }
//     expect(
//       validateOptions(options, 'Test good type options validation'))
//       .toEqual(options)
//   })

//   test('Wrong options should throw an Validation Error', () => {
//     const options: any = {
//       usePriorityEnvVars: 'true',
//       port: 3000
//     }
//     expect(() => validateOptions(
//       options,
//       'Test wrong type validation'
//     )).toThrow(ValidationError);
//   })

//   test('Using usePriorityEnvVars should build object from env vars', () => {
//     const options: CoreOptions = {
//       usePriorityEnvVars: true
//     }

//     const envVars = {
//       PORT: '3000'
//     }

//     sandbox.stub(process, 'env').value(envVars);

//     const core = new Core(options);

//     expect(core.options).toEqual(Object.assign(
//       {},
//       options,
//       {
//         port: envVars.PORT,
//       }));
//   })

//   test('Using usePriorityEnvVars should override options', () => {
//     const options: CoreOptions = {
//       usePriorityEnvVars: true,
//       port: '3000'
//     }

//     const envVars = {
//       PORT: '4000'
//     }

//     sandbox.stub(process, 'env').value(envVars);

//     const core = new Core(options);

//     expect(core.options).toEqual(Object.assign(
//       {},
//       options,
//       {
//         port: envVars.PORT,
//       }));
//     })
// })