-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Jan 03, 2024 at 04:34 PM
-- Server version: 8.0.31
-- PHP Version: 8.0.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `teacooperative`
--

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
CREATE TABLE IF NOT EXISTS `customers` (
  `CustomerID` int NOT NULL,
  `CustomerName` varchar(255) NOT NULL,
  `CustomerMobile` varchar(10) NOT NULL,
  `CustomerAddress` varchar(255) NOT NULL,
  `CustomerEmail` varchar(255) NOT NULL,
  `CustomerType` enum('STATE_GOV','STATE_PRIVATE','SMALL_SCALE','MEDIUM_SCALE','LARGE_SCALE') NOT NULL,
  `RegistrationDate` date NOT NULL,
  `Password` varchar(255) NOT NULL,
  `FactoryID` int DEFAULT NULL,
  `IdentitiCardNumber` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`CustomerID`),
  KEY `FactoryID` (`FactoryID`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`CustomerID`, `CustomerName`, `CustomerMobile`, `CustomerAddress`, `CustomerEmail`, `CustomerType`, `RegistrationDate`, `Password`, `FactoryID`, `IdentitiCardNumber`) VALUES
(771126814, 'John Doe', '123-456-78', '123 Main St, Cityville', 'john.doe@example.com', '', '2023-12-17', '$2b$10$ad8ESU.zJ10.aOTt1SKYOeOHuCskGQZM0rqeOEq3PSuv.Zlw4mBI2', 6, NULL),
(29578467, 'John Doe', '123-456-78', '123 Main St, Cityville', 'john.doe@example.com', '', '2023-12-17', '$2b$10$pI/nQ0sP4oQSi2INJ/LaUODPe1.VfqIdrAtI87dJLVrooY3Hp2W52', 6, NULL),
(629, 'Eva Wilson', '6789012345', '303 Maple St, Suburbia', 'eva.wilson@example.com', '', '2023-12-01', '$2b$10$YYXdHq3BDWaPtOQZ6dQZf.8DfMUA2WRwAAAi93lKLelzk9urRv5jO', 6, NULL),
(732652076, 'John Doe', '123-456-78', '123 Main St, Cityville', 'john.doe@example.com', '', '2023-12-17', '$2b$10$s2VChz8wTm6wVr6x7onA6uBXMYPW.cKj89GSy.TBsMwR7S6GP9Xc.', NULL, '6'),
(885787177, 'John Doe', '123-456-78', '123 Main St, Cityville', 'john.doe@example.com', '', '2023-12-17', '$2b$10$f7L.JbJYD1F8rv84m326neWBqmPQDm645/FN.C3xpBrcWeZsm01tq', NULL, '6'),
(537887908, 'John Doe', '123-456-78', '123 Main St, Cityville', 'john.doe@example.com', '', '2023-12-17', '$2b$10$kWjMK1oqPKOKqN21uyBaBuRc/sLx68BH4eN2x09.LQA619ert1eGi', NULL, '6'),
(48604105, 'John Doe', '123-456-78', '123 Main St, Cityville', 'john.doe@example.com', '', '2023-12-17', '$2b$10$tKp4IlC2o7fxYNLgMyMJ1uD1fQPq/z0Z..bdHK0fGFps/7ocomtNi', NULL, '6'),
(429748491, 'John Doe', '123-456-78', '123 Main St, Cityville', 'john.doe@example.com', '', '2023-12-17', '$2b$10$S3/zNsSdWV2uGyETqxCUP.uG9/vx8zF4VDg4UdvVsw1Jj/2iE5lYu', NULL, '6'),
(41528989, 'John Doe', '123-456-78', '123 Main St, Cityville', 'john.doe@example.com', '', '2023-12-17', '$2b$10$KQ1x65/NBOxC24StIAYWduRlKWPg73NmgeE7urmFKaw3lyGM7EZUW', NULL, '6'),
(122498445, 'John Doe', '123-456-78', '123 Main St, Cityville', 'john.doe@example.com', '', '2023-12-17', '$2b$10$/3YDrDO7n/fKGNTtmV.zJOvnOgwaKyMHbIJynNJoLwzfaDrtGvk4q', 6, '8427394827358927593723572'),
(786347225, 'John Doe', '123-456-78', '123 Main St, Cityville', 'john.doe@example.com', '', '2023-12-17', '$2b$10$YPlp/CpbHGpLr7ciarl6z.xYaoNsQw4faRRH4jdakZdhdznDjCkkm', 6, '8427394827358927593723572'),
(177182791, 'John Doe', '123-456-78', '123 Main St, Cityville', 'john.doe@example.com', '', '2023-12-17', '$2b$10$mapZBz9e3piWrZwIURuA.eHwQG5Nyk8UXwmCJ8QnD.au9OCAj05hC', 6, '8427394827358927593723572'),
(690593835, 'John Doe', '123-456-78', '123 Main St, Cityville', 'john.doe@example.com', '', '2023-12-17', '$2b$10$6gccS3Vdmsgq.tONPs4mL.Sr74ys1nbh5U3fQXzkMvgcBSmz6YL6C', 6, '8427394827358927593723572'),
(41704261, 'John Doe', '123-456-78', '123 Main St, Cityville', 'john.doe@example.com', '', '2023-12-17', '$2b$10$nUcGeEYSO0E/BoCZIcA8ieJ/NfadMXLEBQKdkYyI3hzxIv5r6zs8G', 6, '8427394827358927593723572'),
(308199494, 'John Doe', '123-456-78', '123 Main St, Cityville', 'john.doe@example.com', '', '2023-12-17', '$2b$10$d..z.NhtNLi3DDE3Y8O/CeRQRCfDNnua23TyJNfJ8l1xA89m1Ntm2', 6, '8427394827358927593723572'),
(337681643, 'John Doe', '123-456-78', '123 Main St, Cityville', 'john.doe@example.com', '', '2023-12-17', '$2b$10$7t/g3qKw83DDHNFr9N/78edNx768i52Y9CxBvvyrWjyP9yCyGBVFK', 6, '8427394827358927593723572'),
(339107797, 'John Doe', '123-456-78', '123 Main St, Cityville', 'john.doe@example.com', '', '2023-12-17', '$2b$10$T9gjsm71kRucuA0BgB/pZOEuXxgziJyV7.7893zhRgtRxfVSL.rU2', 6, '8427394827358927593723572'),
(659927646, 'John Doe', '123-456-78', '123 Main St, Cityville', 'john.doe@example.com', '', '2023-12-17', '$2b$10$DRNZ0MKQaVNwI7jKhgriku5d38Me8BQmGaiVIfcdVZ/fUQAFTygqi', 6, '8427394827358927593723572'),
(985997879, 'John Doe', '123-456-78', '123 Main St, Cityville', 'john.doe@example.com', '', '2023-12-17', '$2b$10$01tpDusAiPYxAE62mHB5Durzh4iZpFwRsGrp8Hud7q5pGULouASQO', 6, '8427394827358927593723572'),
(81742421, 'John Doe', '123-456-78', '123 Main St, Cityville', 'john.doe@example.com', '', '2023-12-17', '$2b$10$kMRten0mmYk8T9azaFEczOnh5BICI3KoRUEayjoBKA.rBykEJSMIS', 6, '8427394827358927593723572'),
(800257129, 'John Doe', '123-456-78', '123 Main St, Cityville', 'john.doe@examples.com', '', '2023-12-17', '$2b$10$DA0Yd22YyoJsmIS727W5uu3w5sKUgOzQCkOCeHJouTXXJItK458My', 6, '842739482735892759372357562'),
(588240949, 'John Doe', '123-456-78', '123 Main St, Cityville', 'john.doe@examplel.com', '', '2023-12-25', '$2b$10$yq9OhpMh8.Ga93SF71ER8O2LSBKH3MJI1KgtjRimggoojkbvIIs06', 6, 'huhuhuhuh84394893');

-- --------------------------------------------------------

--
-- Table structure for table `dailyteacollection`
--

DROP TABLE IF EXISTS `dailyteacollection`;
CREATE TABLE IF NOT EXISTS `dailyteacollection` (
  `CollectionID` int NOT NULL,
  `CollectionDate` date NOT NULL,
  `TeaWeightCollected` decimal(10,2) NOT NULL,
  `WaterWeightCollected` decimal(10,2) NOT NULL,
  `ActualTeaWeight` decimal(10,2) NOT NULL,
  `BaseLongitude` decimal(10,2) NOT NULL,
  `BaseLatitude` decimal(10,2) NOT NULL,
  `FieldID` int DEFAULT NULL,
  `EmployeeID` int DEFAULT NULL,
  PRIMARY KEY (`CollectionID`),
  KEY `FieldID` (`FieldID`),
  KEY `EmployeeID` (`EmployeeID`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `distributortable`
--

DROP TABLE IF EXISTS `distributortable`;
CREATE TABLE IF NOT EXISTS `distributortable` (
  `distributorId` int NOT NULL AUTO_INCREMENT,
  `distributorAddress` varchar(255) NOT NULL,
  `distributorLatitude` double NOT NULL,
  `distributorLongitude` double NOT NULL,
  `distributorMobile` varchar(10) NOT NULL,
  `distributorEmail` varchar(255) NOT NULL,
  `baseAddress` varchar(255) NOT NULL,
  `subRegionId` int NOT NULL,
  `supervisorId` int NOT NULL,
  PRIMARY KEY (`distributorId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `drivers`
--

DROP TABLE IF EXISTS `drivers`;
CREATE TABLE IF NOT EXISTS `drivers` (
  `driverId` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `driver_license` varchar(255) NOT NULL,
  `isInternal` tinyint(1) NOT NULL,
  `distributorId` int NOT NULL,
  PRIMARY KEY (`driverId`),
  KEY `distributorId` (`distributorId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
CREATE TABLE IF NOT EXISTS `employees` (
  `EmployeeID` int NOT NULL,
  `EmployeeName` varchar(255) NOT NULL,
  `JoiningDate` date NOT NULL,
  `Email` varchar(255) NOT NULL,
  `Mobile` varchar(10) NOT NULL,
  `Password` varchar(255) NOT NULL,
  `RoleID` int DEFAULT NULL,
  `FactoryID` int DEFAULT NULL,
  PRIMARY KEY (`EmployeeID`),
  KEY `FactoryID` (`FactoryID`),
  KEY `RoleID` (`RoleID`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`EmployeeID`, `EmployeeName`, `JoiningDate`, `Email`, `Mobile`, `Password`, `RoleID`, `FactoryID`) VALUES
(1, 'John Doe', '2023-01-01', 'john.doe@example.com', '1234567890', 'password123', 1, 1),
(2, 'Jane Smith', '2023-02-01', 'jane.smith@example.com', '2345678901', 'password456', 2, 2),
(3, 'Bob Johnson', '2023-03-01', 'bob.johnson@example.com', '3456789012', 'password789', 3, 3),
(4, 'Alice Brown', '2023-04-01', 'alice.brown@example.com', '4567890123', 'passwordabc', 4, 4),
(5, 'Charlie Davis', '2023-05-01', 'charlie.davis@example.com', '5678901234', 'passworddef', 5, 5),
(6, 'Eva Wilson', '2023-06-01', 'eva.wilson@example.com', '6789012345', 'passwordeg', 6, 6),
(7, 'Frank White', '2023-07-01', 'frank.white@example.com', '7890123456', 'passwordhij', 7, 7),
(8, 'Grace Miller', '2023-08-01', 'grace.miller@example.com', '8901234567', 'passwordklm', 8, 8),
(9, 'Henry Garcia', '2023-09-01', 'henry.garcia@example.com', '9012345678', 'passwordnop', 9, 9),
(10, 'Ivy Taylor', '2023-10-01', 'ivy.taylor@example.com', '0123456789', 'passwordqrs', 10, 10),
(565542635, 'John Doe', '0000-00-00', '123 Main Street, Cityville', 'johns.doe@', 'F001', 0, 2023),
(569090821, 'John Doe', '0000-00-00', '123 Main Street, Cityville', 'johns.doe@', '1', 1, 2023),
(68180825, 'John Doe', '0000-00-00', '123 Main Street, Cityville', 'johns.doe@', '1', 1, 2023),
(85662635, 'John Doe', '2023-12-31', 'johns.doe@example.com', '123-456-78', '$2b$10$xH5BpXsbyDnxWsxu1LNqJewYi9.ScO49wDw5UHR7BCULqB7BmVLKi', 1, 1),
(430162870, 'John Doe', '2024-01-03', 'john.doe@example5.com', '123-456-78', '$2b$10$3g0RAzCZHharDjloUw7Nreb1zicNUCSHqktOulfh/eTEB5W1GrH2y', 1, 1),
(890200025, 'John Doe', '2024-01-03', 'john.doe@example6.com', '123-456-78', '$2b$10$KJI6dI97nogYEO.4/5nCx.ygohQ/2VFcnzL28RQak99jXCfUmXZha', 1, 1),
(604977108, 'John Doe', '2024-01-03', 'john.doe@example9.com', '123-456-78', '$2b$10$AfWp74.pXfq37fEuhRFJKen2eq3cKqPgF7hH6yzaqk8pkLgv.GCoG', 15, 1);

-- --------------------------------------------------------

--
-- Table structure for table `environmentalzone`
--

DROP TABLE IF EXISTS `environmentalzone`;
CREATE TABLE IF NOT EXISTS `environmentalzone` (
  `ZoneID` int NOT NULL,
  `ZoneName` varchar(255) NOT NULL,
  `Temperature` decimal(10,2) NOT NULL,
  `Humidity` decimal(10,2) NOT NULL,
  `Rainfall` decimal(10,2) NOT NULL,
  `WindSpeed` decimal(10,2) NOT NULL,
  `FieldID` int DEFAULT NULL,
  PRIMARY KEY (`ZoneID`),
  KEY `FieldID` (`FieldID`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `factories`
--

DROP TABLE IF EXISTS `factories`;
CREATE TABLE IF NOT EXISTS `factories` (
  `FactoryID` int NOT NULL,
  `FactoryName` varchar(255) NOT NULL,
  `FactorySize` enum('SMALL','MEDIUM','LARGE') NOT NULL,
  `FactoryMobile` varchar(10) NOT NULL,
  `FactoryAddress` varchar(255) NOT NULL,
  `FactoryEmail` varchar(255) NOT NULL,
  `RegionID` int DEFAULT NULL,
  PRIMARY KEY (`FactoryID`),
  KEY `RegionID` (`RegionID`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `factories`
--

INSERT INTO `factories` (`FactoryID`, `FactoryName`, `FactorySize`, `FactoryMobile`, `FactoryAddress`, `FactoryEmail`, `RegionID`) VALUES
(1, 'Factory1', 'SMALL', '1234567890', 'Factory 1 Address', 'factory1@example.com', 1),
(2, 'Factory2', 'MEDIUM', '2345678901', 'Factory 2 Address', 'factory2@example.com', 2),
(3, 'Factory3', 'LARGE', '3456789012', 'Factory 3 Address', 'factory3@example.com', 3),
(4, 'Factory4', 'SMALL', '4567890123', 'Factory 4 Address', 'factory4@example.com', 4),
(5, 'Factory5', 'MEDIUM', '5678901234', 'Factory 5 Address', 'factory5@example.com', 5),
(6, 'Factory6', 'LARGE', '6789012345', 'Factory 6 Address', 'factory6@example.com', 6),
(7, 'Factory7', 'SMALL', '7890123456', 'Factory 7 Address', 'factory7@example.com', 7),
(8, 'Factory8', 'MEDIUM', '8901234567', 'Factory 8 Address', 'factory8@example.com', 8),
(9, 'Factory9', 'LARGE', '9012345678', 'Factory 9 Address', 'factory9@example.com', 9),
(10, 'Factory10', 'SMALL', '0123456789', 'Factory 10 Address', 'factory10@example.com', 10);

-- --------------------------------------------------------

--
-- Table structure for table `fertilizerinfo`
--

DROP TABLE IF EXISTS `fertilizerinfo`;
CREATE TABLE IF NOT EXISTS `fertilizerinfo` (
  `FertilizerID` int NOT NULL,
  `FertilizerName` varchar(255) NOT NULL,
  `FertilizerType` enum('NITROGEN','PHOSPHORUS','POTASSIUM','MICRO_NUTRIENTS') NOT NULL,
  `FertilizerQuantity` decimal(10,2) NOT NULL,
  `FertilizerCost` decimal(10,2) NOT NULL,
  `FertilizerDate` date NOT NULL,
  `FieldID` int DEFAULT NULL,
  PRIMARY KEY (`FertilizerID`),
  KEY `FieldID` (`FieldID`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fieldinfo`
--

DROP TABLE IF EXISTS `fieldinfo`;
CREATE TABLE IF NOT EXISTS `fieldinfo` (
  `FieldID` int NOT NULL,
  `FieldName` varchar(255) NOT NULL,
  `FieldSize` decimal(10,2) NOT NULL,
  `FieldAddress` varchar(255) NOT NULL,
  `TeaType` varchar(255) NOT NULL,
  `BaseLocation` varchar(255) NOT NULL,
  `BaseElevation` decimal(10,2) NOT NULL,
  `SoilType` varchar(255) NOT NULL,
  `Attitude` decimal(10,2) NOT NULL,
  `Longitude` decimal(10,2) NOT NULL,
  `RouteID` int DEFAULT NULL,
  `OwnerID` int DEFAULT NULL,
  `ZoneID` int DEFAULT NULL,
  PRIMARY KEY (`FieldID`),
  KEY `RouteID` (`RouteID`),
  KEY `ZoneID` (`ZoneID`),
  KEY `OwnerID` (`OwnerID`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `jwttokenscustomer`
--

DROP TABLE IF EXISTS `jwttokenscustomer`;
CREATE TABLE IF NOT EXISTS `jwttokenscustomer` (
  `TokenID` int NOT NULL AUTO_INCREMENT,
  `Token` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `RefreshToken` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `UserID` int DEFAULT NULL,
  PRIMARY KEY (`TokenID`),
  KEY `UserID` (`UserID`)
) ENGINE=MyISAM AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `jwttokenscustomer`
--

INSERT INTO `jwttokenscustomer` (`TokenID`, `Token`, `RefreshToken`, `UserID`) VALUES
(24, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InNpZ25EYXRhIjp7InVzZXJFbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGVsLmNvbSIsInVzZXJOYW1lIjoiSm9obiBEb2UiLCJ1c2VySWQiOjU4ODI0MDk0OSwidXNlclR5cGUiOiJST0xFLkNVU1RPTUVSIiwibG9naW5UaW1lIjoiMjAyMy0xMi0zMVQxMDozMjoxMS4xMjVaIn19LCJpYXQiOjE3MDQwMTg3MzEsImV4cCI6MTcwNDI3NzkzMX0.YDw3RCPp327PrC6-Dz21_JoaNtJfFAjaUNZglrT-BNs', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InNpZ25EYXRhIjp7InVzZXJFbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGVsLmNvbSIsInVzZXJOYW1lIjoiSm9obiBEb2UiLCJ1c2VySWQiOjU4ODI0MDk0OSwidXNlclR5cGUiOiJST0xFLkNVU1RPTUVSIiwibG9naW5UaW1lIjoiMjAyMy0xMi0zMVQxMDozMjoxMS4xMjVaIn19LCJpYXQiOjE3MDQwMTg3MzEsImV4cCI6MTcwNDYyMzUzMX0.SA-EqrlBAXEOCe9a4zfA_VdqBfwj78B4ZMiGhLxcdRg', 588240949);

-- --------------------------------------------------------

--
-- Table structure for table `jwttokensemployee`
--

DROP TABLE IF EXISTS `jwttokensemployee`;
CREATE TABLE IF NOT EXISTS `jwttokensemployee` (
  `TokenID` int NOT NULL AUTO_INCREMENT,
  `Token` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `RefreshToken` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `UserID` int DEFAULT NULL,
  PRIMARY KEY (`TokenID`),
  KEY `UserID` (`UserID`)
) ENGINE=MyISAM AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `jwttokensemployee`
--

INSERT INTO `jwttokensemployee` (`TokenID`, `Token`, `RefreshToken`, `UserID`) VALUES
(8, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InNpZ25EYXRhIjp7InVzZXJFbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGU1LmNvbSIsInVzZXJOYW1lIjoiSm9obiBEb2UiLCJ1c2VySWQiOjQzMDE2Mjg3MCwidXNlclR5cGUiOjEsImxvZ2luVGltZSI6IjIwMjQtMDEtMDNUMTQ6MjA6NDcuMjI2WiJ9fSwiaWF0IjoxNzA0MjkxNjQ3LCJleHAiOjE3MDQ1NTA4NDd9.OCAGfOXYfE64S1iT9ftpo72gKDuYzLDJk_wO6btEQOg', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InNpZ25EYXRhIjp7InVzZXJFbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGU1LmNvbSIsInVzZXJOYW1lIjoiSm9obiBEb2UiLCJ1c2VySWQiOjQzMDE2Mjg3MCwidXNlclR5cGUiOjEsImxvZ2luVGltZSI6IjIwMjQtMDEtMDNUMTQ6MjA6NDcuMjI2WiJ9fSwiaWF0IjoxNzA0MjkxNjQ3LCJleHAiOjE3MDQ4OTY0NDd9.E5I6uLCG2FGIKKLPVPtQUAxv7QiY0nFNTk-DWz8bESw', 430162870),
(12, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InNpZ25EYXRhIjp7InVzZXJFbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGU5LmNvbSIsInVzZXJOYW1lIjoiSm9obiBEb2UiLCJ1c2VySWQiOjYwNDk3NzEwOCwidXNlclR5cGUiOiJST0xFLkFETUlOIiwibG9naW5UaW1lIjoiMjAyNC0wMS0wM1QxNjoyMDoyNS43OTFaIn19LCJpYXQiOjE3MDQyOTg4MjUsImV4cCI6MTcwNDU1ODAyNX0.ZFF7nd0xRn27yTSA5JpqNwwHf8APfJ7_wytynlHvZvs', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InNpZ25EYXRhIjp7InVzZXJFbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGU5LmNvbSIsInVzZXJOYW1lIjoiSm9obiBEb2UiLCJ1c2VySWQiOjYwNDk3NzEwOCwidXNlclR5cGUiOiJST0xFLkFETUlOIiwibG9naW5UaW1lIjoiMjAyNC0wMS0wM1QxNjoyMDoyNS43OTFaIn19LCJpYXQiOjE3MDQyOTg4MjUsImV4cCI6MTcwNDkwMzYyNX0.YpPR9dqs9twYd9ptlqbLFwoSJUXqVHp_MXpyAo9B48Q', 604977108);

-- --------------------------------------------------------

--
-- Table structure for table `regions`
--

DROP TABLE IF EXISTS `regions`;
CREATE TABLE IF NOT EXISTS `regions` (
  `RegionID` int NOT NULL,
  `RegionName` varchar(255) NOT NULL,
  PRIMARY KEY (`RegionID`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `regions`
--

INSERT INTO `regions` (`RegionID`, `RegionName`) VALUES
(1, 'North'),
(2, 'South'),
(3, 'East'),
(4, 'West'),
(5, 'Central'),
(6, 'Northeast'),
(7, 'Northwest'),
(8, 'Southeast'),
(9, 'Southwest'),
(10, 'Midwest');

-- --------------------------------------------------------

--
-- Table structure for table `roadrouting`
--

DROP TABLE IF EXISTS `roadrouting`;
CREATE TABLE IF NOT EXISTS `roadrouting` (
  `RoutingID` int NOT NULL,
  `SourceFactoryID` int DEFAULT NULL,
  `Destination` decimal(10,2) NOT NULL,
  `RoundTrip` decimal(10,2) NOT NULL,
  `StartLongitude` decimal(10,2) NOT NULL,
  `StartLatitude` decimal(10,2) NOT NULL,
  `EndLongitude` decimal(10,2) NOT NULL,
  `EndLatitude` decimal(10,2) NOT NULL,
  `TotalStops` int NOT NULL,
  `Duration` int NOT NULL,
  PRIMARY KEY (`RoutingID`),
  KEY `SourceFactoryID` (`SourceFactoryID`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `userroles`
--

DROP TABLE IF EXISTS `userroles`;
CREATE TABLE IF NOT EXISTS `userroles` (
  `RoleID` int NOT NULL AUTO_INCREMENT,
  `RoleName` varchar(255) NOT NULL,
  `CreationDate` date NOT NULL,
  `Description` varchar(255) NOT NULL,
  PRIMARY KEY (`RoleID`)
) ENGINE=MyISAM AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `userroles`
--

INSERT INTO `userroles` (`RoleID`, `RoleName`, `CreationDate`, `Description`) VALUES
(1, 'ADMIN', '2023-01-01', 'Administrator Role'),
(2, 'MANAGER', '2023-01-02', 'Manager Role'),
(3, 'WORKER', '2023-01-03', 'Worker Role'),
(4, 'SUPERVISOR', '2023-01-04', 'Supervisor Role'),
(5, 'DRIVER', '2023-01-05', 'Driver Role'),
(6, 'TEA_COLLECTOR', '2023-01-06', 'Tea Collector Role'),
(7, 'ADMIN', '2023-01-07', 'Administrator Role'),
(8, 'MANAGER', '2023-01-08', 'Manager Role'),
(9, 'WORKER', '2023-01-09', 'Worker Role'),
(10, 'SUPERVISOR', '2023-01-10', 'Supervisor Role'),
(11, 'ROLE.undefined', '0000-00-00', '2023-12-31 14:43:07.183'),
(12, 'ROLE.undefined', '0000-00-00', '2023-12-31 14:51:26.693'),
(13, 'ROLE.undefined', '0000-00-00', '2023-12-31 14:52:18.198'),
(14, 'ROLE.function toUpperCase() { [native code] }', '2023-12-31', 'Administrator'),
(15, 'ROLE.ADMIN', '2023-12-31', 'Administrator');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`) VALUES
(1, 'john_doe', 'john.doe@example.com'),
(2, 'jane_doe', 'jane.doe@example.com');

-- --------------------------------------------------------

--
-- Table structure for table `vehiclemappings`
--

DROP TABLE IF EXISTS `vehiclemappings`;
CREATE TABLE IF NOT EXISTS `vehiclemappings` (
  `VehicleID` int NOT NULL,
  `VehicleNumber` varchar(255) NOT NULL,
  `VehicleType` enum('TRUCK','LORRY','MINI_LORRY') NOT NULL,
  `VolumeCapacity` decimal(10,2) NOT NULL,
  `WeightCapacity` decimal(10,2) NOT NULL,
  `FactoryID` int DEFAULT NULL,
  `DriverID` int DEFAULT NULL,
  `RouteID` int DEFAULT NULL,
  PRIMARY KEY (`VehicleID`),
  KEY `FactoryID` (`FactoryID`),
  KEY `DriverID` (`DriverID`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
