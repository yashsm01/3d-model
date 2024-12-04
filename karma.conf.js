module.exports = function(config) {
  config.set({
    frameworks: ['jasmine'],
    files: [
      'src/**/*.spec.ts'
    ],
    browsers: ['Chrome'],
    singleRun: true
  });
};