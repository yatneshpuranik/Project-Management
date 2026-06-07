import jwt from 'jsonwebtoken'


const genToken = (id) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('Missing JWT_SECRET environment variable')
    }

    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES || '1d',
    })
}

export default genToken

