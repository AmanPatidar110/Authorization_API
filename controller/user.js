exports.getCourses = (req, res, next) => {
    res.json({
        message: "Authorized",
        yourCourses: ["A", "B", "C"]
    });
}