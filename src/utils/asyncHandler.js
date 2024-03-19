const asyncHandler = (requestFunction) => {
  return (req, res, next) => {
    Promise.resolve(requestFunction(req, res, next)).catch((err) => next(err));
  };
};
export { asyncHandler };

// 1 wraper function banavi chhavi je function as argument lechhe and tene handle kare chhe

// const asyncHandler = (requestFunction) => async (req, res, next) => {
//   try {
//     await requestFunction(req, res, next);
//   } catch (error) {
//     res.status(error.code || 500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// const asyncHandler = (requestFunction) => {
//   async (req, res, next) => {
//     try {
//     } catch (error) {}
//   };
// };
