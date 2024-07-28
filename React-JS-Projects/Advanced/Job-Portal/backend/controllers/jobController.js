import mongoose from "mongoose";
import { check, validationResult } from "express-validator";
import Jobs from "../models/jobsModel.js";
import Companies from "../models/companiesModel.js";

// Input validation and sanitization middleware
const validateJobInput = [
  check("jobTitle").notEmpty().withMessage("Job title is required"),
  check("jobType").notEmpty().withMessage("Job type is required"),
  check("location").notEmpty().withMessage("Location is required"),
  check("salary").notEmpty().withMessage("Salary is required"),
  check("desc").notEmpty().withMessage("Description is required"),
  check("requirements").notEmpty().withMessage("Requirements are required"),
];

export const createJob = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      jobTitle,
      jobType,
      location,
      salary,
      vacancies,
      experience,
      desc,
      requirements,
    } = req.body;

    const id = req.body.user.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).send("No Company with id: " + id);
    }

    const jobPost = {
      jobTitle,
      jobType,
      location,
      salary,
      vacancies,
      experience,
      detail: { desc, requirements },
      company: id,
    };

    const job = new Jobs(jobPost);
    await job.save();

    const company = await Companies.findById(id);
    if (company) {
      company.jobPosts.push(job._id);
      await company.save();
    }

    res.status(200).json({
      success: true,
      message: "Job Posted Successfully",
      job,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const updateJob = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      jobTitle,
      jobType,
      location,
      salary,
      vacancies,
      experience,
      desc,
      requirements,
    } = req.body;
    const { jobId } = req.params;

    const id = req.body.user.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).send("No Company with id: " + id);
    }

    const jobPost = {
      jobTitle,
      jobType,
      location,
      salary,
      vacancies,
      experience,
      detail: { desc, requirements },
    };

    const updatedJob = await Jobs.findByIdAndUpdate(jobId, jobPost, { new: true });

    res.status(200).json({
      success: true,
      message: "Job Post Updated Successfully",
      job: updatedJob,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const getJobPosts = async (req, res, next) => {
  try {
    const { search, sort, location, jtype, exp } = req.query;
    const types = jtype?.split(",");
    const experience = exp?.split("-");

    let queryObject = {};

    if (location) {
      queryObject.location = { $regex: location, $options: "i" };
    }

    if (types) {
      queryObject.jobType = { $in: types };
    }

    if (experience) {
      queryObject.experience = {
        $gte: Number(experience[0]) - 1,
        $lte: Number(experience[1]) + 1,
      };
    }

    if (search) {
      queryObject.$or = [
        { jobTitle: { $regex: search, $options: "i" } },
        { jobType: { $regex: search, $options: "i" } },
      ];
    }

    let queryResult = Jobs.find(queryObject).populate({
      path: "company",
      select: "-password",
    });

    if (sort) {
      const sortOptions = {
        Newest: "-createdAt",
        Oldest: "createdAt",
        "A-Z": "jobTitle",
        "Z-A": "-jobTitle",
      };
      queryResult = queryResult.sort(sortOptions[sort] || "-createdAt");
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const totalJobs = await Jobs.countDocuments(queryObject);
    const numOfPage = Math.ceil(totalJobs / limit);

    queryResult = queryResult.skip(skip).limit(limit);

    const jobs = await queryResult;

    res.status(200).json({
      success: true,
      totalJobs,
      data: jobs,
      page,
      numOfPage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const getJobById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const job = await Jobs.findById(id).populate({
      path: "company",
      select: "-password",
    });

    if (!job) {
      return res.status(404).json({
        message: "Job Post Not Found",
        success: false,
      });
    }

    const searchQuery = {
      $or: [
        { jobTitle: { $regex: job.jobTitle, $options: "i" } },
        { jobType: { $regex: job.jobType, $options: "i" } },
      ],
    };

    const similarJobs = await Jobs.find(searchQuery)
      .populate({
        path: "company",
        select: "-password",
      })
      .sort({ _id: -1 })
      .limit(6);

    res.status(200).json({
      success: true,
      data: job,
      similarJobs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const deleteJobPost = async (req, res, next) => {
  try {
    const { id } = req.params;

    await Jobs.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Job Post Deleted Successfully.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};
