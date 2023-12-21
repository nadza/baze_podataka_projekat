SET foreign_key_checks = 0;
DROP TABLE IF EXISTS `Book`;
CREATE TABLE IF NOT EXISTS `Book` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL,
  `author` varchar(200) NOT NULL,
  PRIMARY KEY (`ID`),
  UNIQUE(`title`, `author`)
);

DROP TABLE IF EXISTS `BookRepeated`;
CREATE TABLE IF NOT EXISTS `BookRepeated` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL,
  `author` varchar(200) NOT NULL,
  PRIMARY KEY (`ID`)
);

DROP TABLE IF EXISTS `User`;
CREATE TABLE IF NOT EXISTS `User` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(30) NOT NULL UNIQUE,
  `email` varchar(200) NOT NULL UNIQUE,
  `cryptedPassword` varchar(255) NOT NULL,
  PRIMARY KEY (`ID`)
);

DROP TABLE IF EXISTS `Users_to_Books`;
CREATE TABLE IF NOT EXISTS `Users_to_Books` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `userID` int(11) NOT NULL,
  `bookID` int(11) NOT NULL,
  FOREIGN KEY (userID) REFERENCES User(ID),
  FOREIGN KEY (bookID) REFERENCES Book(ID),
  UNIQUE(`userID`, `bookID`),
  PRIMARY KEY (`ID`)
);
SET foreign_key_checks = 1;
